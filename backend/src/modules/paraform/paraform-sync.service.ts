import { and, asc, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "../../db";
import { candidates, candidateStageHistory } from "../../db/schema/candidates";
import { jobPipelineStages } from "../../db/schema/pipeline";
import {
  paraformCandidateLinks,
  paraformRoleLinks,
  paraformSyncRuns,
  type ParaformRoleLink,
  type ParaformSyncRun,
} from "../../db/schema/paraform";
import { McpAuthError } from "../../shared/integrations/paraform/mcp-client";
import {
  ParaformMappingPendingError,
  type ParaformApi,
  type ParaformSubmission,
} from "../../shared/integrations/paraform/paraform-api";
import { socketService } from "../../shared/services/socket.service";
import { scoringService } from "../scoring/scoring.service";
import { hasPgCode, PG_UNIQUE_VIOLATION } from "../../utils/pg-errors";
import { getErrorMessage } from "../../utils/error.utils";
import logger from "../../utils/logger";
import {
  paraformConnectionService,
  ParaformNotConnectedError,
} from "./paraform-connection.service";
import {
  candidateName,
  decisionFor,
  decisionToSend,
  planImports,
} from "./paraform-sync-rules";

/** A run still "running" after this long was cut off (the worker stopped) and no longer blocks. */
const STALE_RUN_MS = 30 * 60_000;

type RunCounts = {
  candidatesImported: number;
  decisionsSent: number;
  problems: string[];
};

/** Words an admin can act on, for an error that stopped the whole run. */
export function describeRunError(error: unknown): string {
  if (error instanceof ParaformNotConnectedError) return error.message;
  if (error instanceof McpAuthError) {
    return `Paraform refused the connection (${error.message}). Paraform grants hiring-manager access on request; once it does, run the sync again or reconnect.`;
  }
  if (error instanceof ParaformMappingPendingError) {
    return "This version of OpenATS cannot read Paraform roles and candidates yet.";
  }
  return "The Paraform sync failed. The server log has the details.";
}

function isFatal(error: unknown): boolean {
  return (
    error instanceof ParaformNotConnectedError ||
    error instanceof McpAuthError ||
    error instanceof ParaformMappingPendingError
  );
}

/** The first stage of each job, where imported candidates start. */
async function firstStages(jobIds: number[]): Promise<Map<number, number>> {
  if (jobIds.length === 0) return new Map();
  const stages = await db
    .select({ id: jobPipelineStages.id, jobId: jobPipelineStages.jobId })
    .from(jobPipelineStages)
    .where(inArray(jobPipelineStages.jobId, jobIds))
    .orderBy(asc(jobPipelineStages.position));
  const first = new Map<number, number>();
  for (const stage of stages)
    if (!first.has(stage.jobId)) first.set(stage.jobId, stage.id);
  return first;
}

function linkValues(
  submission: ParaformSubmission,
  candidateId: number,
  roleLinkId: number,
) {
  return {
    paraformSubmissionId: submission.id,
    candidateId,
    roleLinkId,
    recruiterName: submission.recruiterName?.slice(0, 255) ?? null,
    submissionNote: submission.note,
    paraformUrl: submission.url?.slice(0, 1000) ?? null,
  };
}

async function importRole(
  api: ParaformApi,
  roleLink: ParaformRoleLink,
  counts: RunCounts,
) {
  const submissions = await api.listSubmissions(roleLink.paraformRoleId);
  if (submissions.length === 0) return;

  const imported = await db
    .select({ id: paraformCandidateLinks.paraformSubmissionId })
    .from(paraformCandidateLinks)
    .where(
      inArray(
        paraformCandidateLinks.paraformSubmissionId,
        submissions.map((s) => s.id),
      ),
    );

  const emails = submissions
    .map((s) => s.email?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e));
  const existing = emails.length
    ? await db
        .select({
          candidateId: candidates.id,
          email: candidates.email,
          linkId: paraformCandidateLinks.id,
        })
        .from(candidates)
        .leftJoin(
          paraformCandidateLinks,
          eq(paraformCandidateLinks.candidateId, candidates.id),
        )
        .where(
          and(
            eq(candidates.jobId, roleLink.jobId),
            inArray(candidates.email, emails),
          ),
        )
    : [];

  const plans = planImports({
    submissions,
    importedSubmissionIds: new Set(imported.map((row) => row.id)),
    existingByEmail: new Map(
      existing.map((row) => [
        row.email,
        { candidateId: row.candidateId, linked: row.linkId !== null },
      ]),
    ),
  });

  const firstStageId = (await firstStages([roleLink.jobId])).get(
    roleLink.jobId,
  );
  let createdAny = false;

  for (const plan of plans) {
    const { submission } = plan;
    if (plan.kind === "skip") {
      counts.problems.push(plan.problem);
      continue;
    }
    try {
      if (plan.kind === "link_existing") {
        await db
          .insert(paraformCandidateLinks)
          .values(linkValues(submission, plan.candidateId, roleLink.id));
        continue;
      }
      if (!firstStageId) {
        counts.problems.push(
          `The job for "${roleLink.paraformRoleTitle}" has no pipeline stages, so nobody was imported.`,
        );
        return;
      }
      await db.transaction(async (tx) => {
        const [candidate] = await tx
          .insert(candidates)
          .values({
            ...candidateName(submission),
            email: plan.email,
            phone: submission.phone?.slice(0, 50) ?? null,
            jobId: roleLink.jobId,
            currentStageId: firstStageId,
          })
          .returning({ id: candidates.id });
        if (!candidate) throw new Error("Failed to create candidate");
        await tx
          .insert(candidateStageHistory)
          .values({ candidateId: candidate.id, stageId: firstStageId });
        await tx
          .insert(paraformCandidateLinks)
          .values(linkValues(submission, candidate.id, roleLink.id));
        await scoringService.recompute(candidate.id, tx);
      });
      // No "application received" email: the recruiter, not the candidate, sent this in.
      counts.candidatesImported += 1;
      createdAny = true;
    } catch (error) {
      if (hasPgCode(error, PG_UNIQUE_VIOLATION)) continue; // Another run imported it just now.
      logger.error(
        `[paraform-sync] import of submission ${submission.id} failed: ${getErrorMessage(error)}`,
      );
      const { firstName, lastName } = candidateName(submission);
      counts.problems.push(
        `${firstName} ${lastName} could not be imported. The server log has the details.`,
      );
    }
  }

  if (createdAny) socketService.notifyCandidateApplied(roleLink.jobId);
}

async function sendDecisions(api: ParaformApi, counts: RunCounts) {
  const linked = await db
    .select({
      linkId: paraformCandidateLinks.id,
      submissionId: paraformCandidateLinks.paraformSubmissionId,
      decisionSent: paraformCandidateLinks.decisionSent,
      jobId: candidates.jobId,
      status: candidates.status,
      currentStageId: candidates.currentStageId,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
    })
    .from(paraformCandidateLinks)
    .innerJoin(
      candidates,
      eq(candidates.id, paraformCandidateLinks.candidateId),
    );

  const first = await firstStages([...new Set(linked.map((row) => row.jobId))]);

  for (const row of linked) {
    const decision = decisionToSend(
      decisionFor({
        status: row.status,
        inFirstStage: row.currentStageId === first.get(row.jobId),
      }),
      row.decisionSent,
    );
    if (!decision) continue;

    try {
      await api.decide(row.submissionId, decision);
      await db
        .update(paraformCandidateLinks)
        .set({
          decisionSent: decision,
          decisionSentAt: new Date(),
          decisionError: null,
        })
        .where(eq(paraformCandidateLinks.id, row.linkId));
      counts.decisionsSent += 1;
    } catch (error) {
      if (isFatal(error)) throw error;
      const message = getErrorMessage(error);
      await db
        .update(paraformCandidateLinks)
        .set({ decisionError: message.slice(0, 1000) })
        .where(eq(paraformCandidateLinks.id, row.linkId));
      counts.problems.push(
        `Paraform was not told about ${row.firstName} ${row.lastName} (${decision}): ${message}`,
      );
    }
  }
}

export const paraformSyncService = {
  /**
   * Imports new submissions for every linked role, then, if the admin turned it on, sends each
   * candidate's decision back. Returns the run, or null when there is nothing to do: Paraform is
   * not connected, or another run is still going.
   */
  async run(
    trigger: "scheduled" | "manual",
    api: ParaformApi = paraformConnectionService.api(),
  ): Promise<ParaformSyncRun | null> {
    const connection = await paraformConnectionService.getRow();
    if (!connection) return null;

    const staleBefore = new Date(Date.now() - STALE_RUN_MS);
    await db
      .update(paraformSyncRuns)
      .set({
        status: "failed",
        error: "The sync stopped before it finished.",
        finishedAt: new Date(),
      })
      .where(
        and(
          eq(paraformSyncRuns.status, "running"),
          lt(paraformSyncRuns.startedAt, staleBefore),
        ),
      );
    const [busy] = await db
      .select({ id: paraformSyncRuns.id })
      .from(paraformSyncRuns)
      .where(
        and(
          eq(paraformSyncRuns.status, "running"),
          gt(paraformSyncRuns.startedAt, staleBefore),
        ),
      )
      .limit(1);
    if (busy) return null;

    const [run] = await db
      .insert(paraformSyncRuns)
      .values({ trigger })
      .returning();
    if (!run) throw new Error("Failed to start a Paraform sync run");

    const counts: RunCounts = {
      candidatesImported: 0,
      decisionsSent: 0,
      problems: [],
    };
    let error: string | null = null;
    try {
      const roleLinks = await db.select().from(paraformRoleLinks);
      for (const roleLink of roleLinks) {
        try {
          await importRole(api, roleLink, counts);
        } catch (roleError) {
          if (isFatal(roleError)) throw roleError;
          logger.error(
            `[paraform-sync] role ${roleLink.paraformRoleId} failed: ${getErrorMessage(roleError)}`,
          );
          counts.problems.push(
            `Candidates for "${roleLink.paraformRoleTitle}" could not be read from Paraform.`,
          );
        }
      }
      if (connection.sendDecisions) await sendDecisions(api, counts);
    } catch (runError) {
      logger.error(
        `[paraform-sync] run ${run.id} failed: ${getErrorMessage(runError)}`,
      );
      error = describeRunError(runError);
    }

    const [finished] = await db
      .update(paraformSyncRuns)
      .set({
        status: error ? "failed" : "succeeded",
        candidatesImported: counts.candidatesImported,
        decisionsSent: counts.decisionsSent,
        problems: counts.problems,
        error,
        finishedAt: new Date(),
      })
      .where(eq(paraformSyncRuns.id, run.id))
      .returning();
    return finished ?? run;
  },

  async recentRuns(limit = 20): Promise<ParaformSyncRun[]> {
    return db
      .select()
      .from(paraformSyncRuns)
      .orderBy(desc(paraformSyncRuns.startedAt))
      .limit(limit);
  },
};
