import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
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
import { ParaformOAuthError } from "../../shared/integrations/paraform/oauth";
import {
  ParaformUnexpectedAnswerError,
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
  indexExistingByEmail,
  submissionContacts,
  submissionLabel,
  planImports,
} from "./paraform-sync-rules";

/** A run still "running" after this long was cut off (the worker stopped) and no longer blocks. */
const STALE_RUN_MS = 30 * 60_000;

type RunCounts = {
  candidatesImported: number;
  problems: string[];
};

/** Words an admin can act on, for an error that stopped the whole run. */
export function describeRunError(error: unknown): string {
  if (error instanceof ParaformNotConnectedError) return error.message;
  if (error instanceof McpAuthError) {
    return `Paraform refused the connection (${error.message}). Paraform grants hiring-manager access on request; once it does, run the sync again or reconnect.`;
  }
  if (error instanceof ParaformUnexpectedAnswerError) {
    return "Paraform answered in a form this version of OpenATS does not read, so nothing was synced. Paraform may have changed its tools; an OpenATS update may be needed.";
  }
  // A refused sign-in arrives as ParaformNotConnectedError; this is a 429, a 5xx or a bad answer.
  if (error instanceof ParaformOAuthError) {
    return "Paraform's sign-in service did not answer properly, so nothing was synced. The next sync will try again; you don't need to reconnect.";
  }
  return "The Paraform sync failed. The server log has the details.";
}

function isFatal(error: unknown): boolean {
  return (
    error instanceof ParaformNotConnectedError ||
    error instanceof McpAuthError ||
    error instanceof ParaformUnexpectedAnswerError ||
    // Every later call would need the same token, so stop instead of failing role by role.
    error instanceof ParaformOAuthError
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
    submissionNote: submission.note,
    paraformUrl: submission.url?.slice(0, 1000) ?? null,
  };
}

async function importRole(
  api: ParaformApi,
  roleLink: ParaformRoleLink,
  counts: RunCounts,
) {
  const ids = await api.listSubmissionIds(roleLink.paraformRoleId);
  if (ids.length === 0) return;

  const imported = new Set(
    (
      await db
        .select({ id: paraformCandidateLinks.paraformSubmissionId })
        .from(paraformCandidateLinks)
        .where(inArray(paraformCandidateLinks.paraformSubmissionId, ids))
    ).map((row) => row.id),
  );

  // Only new submissions are read in full: the list has no CV text, so each is one more call.
  const submissions: ParaformSubmission[] = [];
  for (const id of ids) {
    if (imported.has(id)) continue;
    try {
      submissions.push(await api.getSubmission(id));
    } catch (error) {
      if (isFatal(error)) throw error;
      logger.error(
        `[paraform-sync] reading submission ${id} failed: ${getErrorMessage(error)}`,
      );
      counts.problems.push(
        `${submissionLabel({ id })} could not be read from Paraform. The next sync will try again.`,
      );
    }
  }
  if (submissions.length === 0) return;

  const emails = submissions.flatMap((submission) => {
    const contacts = submissionContacts(submission);
    return contacts.kind === "found" ? [contacts.email] : [];
  });
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
            // Lower case on both sides: a staff edit can save an email with capitals.
            inArray(sql`lower(${candidates.email})`, emails),
          ),
        )
    : [];

  const plans = planImports({
    submissions,
    importedSubmissionIds: imported,
    existingByEmail: indexExistingByEmail(
      existing.map((row) => ({
        candidateId: row.candidateId,
        email: row.email,
        linked: row.linkId !== null,
      })),
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
            phone: plan.phone?.slice(0, 50) ?? null,
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
      counts.problems.push(
        `${submissionLabel(submission)} could not be imported. The server log has the details.`,
      );
    }
  }

  if (createdAny) socketService.notifyCandidateApplied(roleLink.jobId);
}

export const paraformSyncService = {
  /**
   * Imports new submissions for every linked role. Nothing goes back to Paraform: decisions are
   * made there, because Paraform asks the hiring manager for answers OpenATS cannot give for them.
   * Returns the run, or null when there is nothing to do: Paraform is not connected, or another
   * run is still going.
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
    // uq_paraform_sync_runs_one_running allows one running row, so two workers starting at the
    // same moment cannot both get one: the second insert is skipped and returns nothing.
    const [run] = await db
      .insert(paraformSyncRuns)
      .values({ trigger })
      .onConflictDoNothing()
      .returning();
    if (!run) return null;

    const counts: RunCounts = { candidatesImported: 0, problems: [] };
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
