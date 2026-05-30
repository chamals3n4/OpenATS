import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { candidateRejections, candidates, templates } from "../db/schema";
import { mailService } from "./mail.service";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";

export interface RejectInput {
  candidateId: number;
  jobId: number;
  fromStageId?: number | null;
  reason?: string | null;
  templateId?: number | null;
  emailStatus: "not_sent" | "draft" | "sent";
}

export const rejectionService = {
  async reject(input: RejectInput, rejectedBy: number | null = null) {
    return await db.transaction(async (tx) => {
      // Set candidate status to rejected
      await tx
        .update(candidates)
        .set({
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, input.candidateId));

      // Create rejection record
      const [rejection] = await tx
        .insert(candidateRejections)
        .values({
          candidateId: input.candidateId,
          jobId: input.jobId,
          fromStageId: input.fromStageId ?? null,
          rejectedBy,
          reason: input.reason ?? null,
          templateId: input.templateId ?? null,
          emailStatus: input.emailStatus,
          sentAt: input.emailStatus === "sent" ? new Date() : null,
        })
        .returning();

      if (!rejection) throw new Error("Failed to create rejection record");

      // Send email if template is provided and status is "sent"
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

          const [candidate] = await tx
            .select({ email: candidates.email })
            .from(candidates)
            .where(eq(candidates.id, input.candidateId));

          if (candidate) {
            await mailService.sendRejectionEmail(
              candidate.email,
              subject,
              html,
            );
          }
        }
      }

      return rejection;
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
