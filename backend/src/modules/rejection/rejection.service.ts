import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  candidateRejections,
  candidates,
  candidateStageHistory,
  jobPipelineStages,
  templates,
} from "../../db/schema";
import { writtenEmail } from "../../shared/services/candidate-emails";
import { getCompanyForEmail, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { variableService } from "../template/variable.service";
import { templateEngineService } from "../template/template-engine.service";

/** A rejection that cannot go ahead for a reason the caller may be told, as opposed to a fault. */
export class RejectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectionError";
  }
}

/** Builds the rejection email, or says why this template cannot be used for one. */
async function prepareRejectionEmail(candidateId: number, templateId: number) {
  const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
  if (!template) throw new RejectionError("That email template no longer exists. Choose another.");

  const context = await variableService.getContextForCandidate(candidateId);
  const missing = templateEngineService.missingVariables(template.subject, template.bodyJson, context);
  if (missing.length > 0) {
    const names = missing.map((name) => `{{${name}}}`).join(", ");
    throw new RejectionError(
      `The template "${template.name}" uses ${names}, which ${missing.length === 1 ? "has" : "have"} no value in a rejection email. Remove ${missing.length === 1 ? "it" : "them"} from the template or choose another.`,
    );
  }

  const compiled = templateEngineService.compileTemplate(template.subject, template.bodyJson, context);
  return {
    subject: compiled.subject,
    html: writtenEmail({ ...(await getCompanyForEmail()), contentHtml: compiled.html }),
  };
}

export interface RejectInput {
  candidateId: number;
  reason?: string | null;
  internalNote?: string | null;
  templateId?: number | null;
  emailStatus: "not_sent" | "draft" | "sent";
}

export const rejectionService = {
  /**
   * Rejects the candidate and, if asked, emails them. The email is prepared before anything
   * is saved, so a template that cannot be used stops the rejection early, and it is sent
   * after the rejection is saved, so a mail problem cannot undo the rejection.
   */
  async reject(input: RejectInput, rejectedBy: number | null = null) {
    const wantsEmail = !!input.templateId && input.emailStatus === "sent";
    const prepared = wantsEmail ? await prepareRejectionEmail(input.candidateId, input.templateId!) : null;

    const { rejection, email: recipient } = await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, input.candidateId));

      if (!candidate) throw new RejectionError("Candidate not found");
      if (candidate.status === "rejected") {
        throw new RejectionError("Candidate is already rejected");
      }

      await tx
        .update(candidates)
        .set({
          status: "rejected",
          currentStageId: null,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, input.candidateId));

      const [rejection] = await tx
        .insert(candidateRejections)
        .values({
          candidateId: input.candidateId,
          // From the row read in this transaction, so a stage move that raced the caller's own
          // read cannot leave the record pointing at the wrong job or stage.
          jobId: candidate.jobId,
          fromStageId: candidate.currentStageId ?? null,
          rejectedBy,
          reason: input.reason,
          internalNote: input.internalNote ?? null,
          templateId: input.templateId ?? null,
          emailStatus: input.emailStatus,
          sentAt: input.emailStatus === "sent" ? new Date() : null,
        })
        .returning();

      if (!rejection) throw new Error("Failed to create rejection record");

      return { rejection, email: candidate.email };
    });

    if (!prepared) return { ...rejection, emailFailed: false, renderedSubject: null, renderedHtml: null };

    const result = await sendCandidateEmail({
      candidateId: input.candidateId,
      to: recipient,
      kind: "rejection",
      sentBy: rejectedBy,
      templateId: input.templateId ?? null,
      subject: prepared.subject,
      html: prepared.html,
    });

    if (result.sent) {
      return { ...rejection, emailFailed: false, renderedSubject: prepared.subject, renderedHtml: prepared.html };
    }

    // The candidate is rejected but got no email, so the record must not say "sent".
    const [corrected] = await db
      .update(candidateRejections)
      .set({ emailStatus: "not_sent", sentAt: null })
      .where(eq(candidateRejections.id, rejection.id))
      .returning();
    return {
      ...(corrected ?? rejection),
      emailFailed: true,
      renderedSubject: prepared.subject,
      renderedHtml: prepared.html,
    };
  },

  async unreject(candidateId: number, unrejectedBy: number | null = null) {
    return await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId));

      if (!candidate) throw new Error("Candidate not found");
      if (candidate.status !== "rejected") {
        throw new Error("Candidate is not rejected");
      }

      const [latestRejection] = await tx
        .select()
        .from(candidateRejections)
        .where(eq(candidateRejections.candidateId, candidateId))
        .orderBy(desc(candidateRejections.rejectedAt))
        .limit(1);

      let restoreStageId = latestRejection?.fromStageId ?? null;

      if (!restoreStageId) {
        const [firstStage] = await tx
          .select({ id: jobPipelineStages.id })
          .from(jobPipelineStages)
          .where(eq(jobPipelineStages.jobId, candidate.jobId))
          .orderBy(asc(jobPipelineStages.position))
          .limit(1);

        restoreStageId = firstStage?.id ?? null;
      }

      if (restoreStageId) {
        const [validStage] = await tx
          .select({ id: jobPipelineStages.id })
          .from(jobPipelineStages)
          .where(
            and(
              eq(jobPipelineStages.id, restoreStageId),
              eq(jobPipelineStages.jobId, candidate.jobId),
            ),
          )
          .limit(1);

        restoreStageId = validStage?.id ?? null;
      }

      const [updated] = await tx
        .update(candidates)
        .set({
          status: "active",
          currentStageId: restoreStageId,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candidateId))
        .returning();

      if (!updated) throw new Error("Failed to update candidate");

      if (restoreStageId) {
        await tx.insert(candidateStageHistory).values({
          candidateId,
          stageId: restoreStageId,
          movedBy: unrejectedBy,
        });
      }

      return { candidate: updated, restoredStageId: restoreStageId };
    });
  },

  async getByCandidate(candidateId: number) {
    return db
      .select()
      .from(candidateRejections)
      .where(eq(candidateRejections.candidateId, candidateId))
      .orderBy(desc(candidateRejections.rejectedAt));
  },

  async getById(id: number) {
    const [rejection] = await db
      .select()
      .from(candidateRejections)
      .where(eq(candidateRejections.id, id));
    return rejection ?? null;
  },
};
