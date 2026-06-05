import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  candidateRejections,
  candidates,
  candidateStageHistory,
  jobPipelineStages,
  templates,
} from "../db/schema";
import { mailService } from "./mail.service";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";

export interface RejectInput {
  candidateId: number;
  jobId: number;
  fromStageId?: number | null;
  reason?: string | null;
  internalNote?: string | null;
  templateId?: number | null;
  emailStatus: "not_sent" | "draft" | "sent";
}

export const rejectionService = {
  async reject(input: RejectInput, rejectedBy: number | null = null) {
    return await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, input.candidateId));

      if (!candidate) throw new Error("Candidate not found");
      if (candidate.status === "rejected") {
        throw new Error("Candidate is already rejected");
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
          jobId: input.jobId,
          fromStageId: input.fromStageId ?? candidate.currentStageId ?? null,
          rejectedBy,
          reason: input.reason,
          internalNote: input.internalNote ?? null,
          templateId: input.templateId ?? null,
          emailStatus: input.emailStatus,
          sentAt: input.emailStatus === "sent" ? new Date() : null,
        })
        .returning();

      if (!rejection) throw new Error("Failed to create rejection record");

      if (input.templateId && input.emailStatus === "sent") {
        const [template] = await tx
          .select()
          .from(templates)
          .where(eq(templates.id, input.templateId));

        if (template) {
          const context = await variableService.getContextForCandidate(
            input.candidateId,
          );
          const { subject, html } = templateEngineService.compileTemplate(
            template.subject,
            template.bodyJson,
            context,
          );

          const [candidateWithEmail] = await tx
            .select({ email: candidates.email })
            .from(candidates)
            .where(eq(candidates.id, input.candidateId));

          if (candidateWithEmail) {
            await mailService.sendRejectionEmail(
              candidateWithEmail.email,
              subject,
              html,
            );
          }
        }
      }

      return rejection;
    });
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
