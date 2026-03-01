import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { jobPipelineStages } from "../db/schema";

export type CreateStageInput = {
  name: string;
  position: number;
  stageType?: "none" | "source" | "assessment" | "interview" | "offer" | "rejection" | undefined;
  offerTemplateId?: number | null | undefined;
  offerMode?: "auto_draft" | "auto_send" | null | undefined;
};

export type UpdateStageInput = {
  name?: string | undefined;
  position?: number | undefined;
  stageType?: "none" | "source" | "assessment" | "interview" | "offer" | "rejection" | undefined;
  offerTemplateId?: number | null | undefined;
  offerMode?: "auto_draft" | "auto_send" | null | undefined;
  offerExpiryDays?: number | null | undefined;
  rejectionTemplateId?: number | null | undefined;
};

export const pipelineService = {
  async getByJobId(jobId: number) {
    return db
      .select()
      .from(jobPipelineStages)
      .where(eq(jobPipelineStages.jobId, jobId))
      .orderBy(jobPipelineStages.position);
  },

  async getById(stageId: number) {
    const [stage] = await db
      .select()
      .from(jobPipelineStages)
      .where(eq(jobPipelineStages.id, stageId));
    return stage ?? null;
  },

  async create(jobId: number, input: CreateStageInput) {
    const [created] = await db
      .insert(jobPipelineStages)
      .values({
        jobId,
        name: input.name,
        position: input.position,
        stageType: input.stageType ?? "none",
        offerTemplateId: input.offerTemplateId ?? null,
        offerMode: input.offerMode ?? "auto_draft",
      })
      .returning();
    return created;
  },

  async update(jobId: number, stageId: number, input: UpdateStageInput) {
    const [updated] = await db
      .update(jobPipelineStages)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobPipelineStages.jobId, jobId), 
          eq(jobPipelineStages.id, stageId)
        ),
      )
      .returning();
    return updated ?? null;
  },

  async delete(jobId: number, stageId: number) {
    const [deleted] = await db
      .delete(jobPipelineStages)
      .where(
        and(
          eq(jobPipelineStages.jobId, jobId),
          eq(jobPipelineStages.id, stageId),
        ),
      )
      .returning();
    return deleted ?? null;
  },
};
