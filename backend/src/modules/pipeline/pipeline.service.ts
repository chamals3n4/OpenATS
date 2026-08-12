import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { jobPipelineStages } from "../../db/schema";
import { getErrorCode } from "../../utils/error.utils";

export type CreateStageInput = {
  name: string;
  position?: number;
  stageType?: "screening" | "interview" | "offer" | undefined;
};

export type UpdateStageInput = {
  name?: string | undefined;
  position?: number | undefined;
  stageType?: "screening" | "interview" | "offer" | undefined;
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
    const [last] = await db
      .select({ position: jobPipelineStages.position })
      .from(jobPipelineStages)
      .where(eq(jobPipelineStages.jobId, jobId))
      .orderBy(desc(jobPipelineStages.position))
      .limit(1);

    const fallbackNext = (last?.position ?? 0) + 1;
    const desiredPosition = input.position ?? fallbackNext;

    try {
      const [created] = await db
        .insert(jobPipelineStages)
        .values({
          jobId,
          name: input.name,
          position: desiredPosition,
          stageType: input.stageType ?? "screening",
        })
        .returning();
      return created;
    } catch (err) {
      // If position is already taken, append to the end.
      if (getErrorCode(err) === "23505") {
        const [created] = await db
          .insert(jobPipelineStages)
          .values({
            jobId,
            name: input.name,
            position: fallbackNext,
            stageType: input.stageType ?? "screening",
          })
          .returning();
        return created;
      }
      throw err;
    }
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
          eq(jobPipelineStages.id, stageId),
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

  async reorder(
    jobId: number,
    stages: Array<{ id: number; position: number }>,
  ) {
    return await db.transaction(async (tx) => {
      // First, temporarily set all positions to negative values to avoid unique constraint conflicts
      for (const stage of stages) {
        await tx
          .update(jobPipelineStages)
          .set({ position: -stage.id, updatedAt: new Date() })
          .where(
            and(
              eq(jobPipelineStages.jobId, jobId),
              eq(jobPipelineStages.id, stage.id),
            ),
          );
      }

      // Then, update to the actual target positions
      const results = [];
      for (const stage of stages) {
        const [updated] = await tx
          .update(jobPipelineStages)
          .set({ position: stage.position, updatedAt: new Date() })
          .where(
            and(
              eq(jobPipelineStages.jobId, jobId),
              eq(jobPipelineStages.id, stage.id),
            ),
          )
          .returning();
        results.push(updated);
      }

      return results;
    });
  },
};
