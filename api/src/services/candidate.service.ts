import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db";
import {
  candidates,
  candidateStageHistory,
  candidateCustomAnswers,
  candidateCustomAnswerSelections,
  jobPipelineStages,
  jobCustomQuestions,
  jobAssessmentAttachments,
  jobs,
} from "../db/schema";
import { assessmentExecutionService } from "./assessment-execution.service";
import { offerService } from "./offer.service";
import { jobService } from "./job.service";
import { socketService } from "./socket.service";
import { cleanObject as clean } from "../utils/object.utils";

export interface CustomAnswerInput {
  questionId: number;
  answerText?: string | null | undefined;
  optionIds?: number[] | undefined; 
}

export interface CandidateApplyInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null | undefined;
  resumeUrl?: string | null | undefined;
  customAnswers?: CustomAnswerInput[] | undefined;
}

export interface CandidateFilters {
  stageId?: number | undefined;
  search?: string | undefined;
}



export const candidateService = {
  async apply(jobId: number, input: CandidateApplyInput) {
    const { customAnswers, ...candidateData } = input;

    return await db.transaction(async (tx) => {
      const [firstStage] = await tx
        .select()
        .from(jobPipelineStages)
        .where(eq(jobPipelineStages.jobId, jobId))
        .orderBy(asc(jobPipelineStages.position))
        .limit(1);

      if (!firstStage) {
        throw new Error("No pipeline stages defined for this job");
      }

      const [candidate] = await tx
        .insert(candidates)
        .values(
          clean({
            ...candidateData,
            jobId,
            currentStageId: firstStage.id,
          }),
        )
        .returning();

      if (!candidate) {
        throw new Error("Failed to create candidate");
      }

      await tx.insert(candidateStageHistory).values({
        candidateId: candidate.id,
        stageId: firstStage.id,
      });

      if (customAnswers && customAnswers.length > 0) {
        for (const answer of customAnswers) {
          const [question] = await tx
            .select()
            .from(jobCustomQuestions)
            .where(
              and(
                eq(jobCustomQuestions.id, answer.questionId),
                eq(jobCustomQuestions.jobId, jobId),
              ),
            );

          if (!question) continue;

          if (answer.answerText !== undefined) {
            await tx.insert(candidateCustomAnswers).values({
              candidateId: candidate.id,
              questionId: answer.questionId,
              answerText: answer.answerText,
            });
          }

          if (answer.optionIds && answer.optionIds.length > 0) {
            await tx.insert(candidateCustomAnswerSelections).values(
              answer.optionIds.map((optionId) => ({
                candidateId: candidate.id,
                questionId: answer.questionId,
                optionId,
              })),
            );
          }
        }
      }

      return candidate;
    });
  },

  async getAll(jobId: number, filters: CandidateFilters = {}) {
    const conditions = [eq(candidates.jobId, jobId)];

    if (filters.stageId) {
      conditions.push(eq(candidates.currentStageId, filters.stageId));
    }



    return db
      .select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(desc(candidates.appliedAt));
  },

  async getById(id: number) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));

    if (!candidate) return null;

    const answers = await db
      .select()
      .from(candidateCustomAnswers)
      .where(eq(candidateCustomAnswers.candidateId, id));

    const selections = await db
      .select()
      .from(candidateCustomAnswerSelections)
      .where(eq(candidateCustomAnswerSelections.candidateId, id));

    const history = await db
      .select()
      .from(candidateStageHistory)
      .where(eq(candidateStageHistory.candidateId, id))
      .orderBy(asc(candidateStageHistory.movedAt));

    return {
      ...candidate,
      answers,
      selections,
      history,
    };
  },

  async moveStage(
    candidateId: number,
    newStageId: number,
    movedBy: number | null = null,
  ) {
    return await db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId));

      if (!candidate) throw new Error("Candidate not found");

      const [stage] = await tx
        .select()
        .from(jobPipelineStages)
        .where(
          and(
            eq(jobPipelineStages.id, newStageId),
            eq(jobPipelineStages.jobId, candidate.jobId),
          ),
        );

      if (!stage) throw new Error("Invalid stage for this job");

      const [updated] = await tx
        .update(candidates)
        .set({
          currentStageId: newStageId,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candidateId))
        .returning();

      await tx.insert(candidateStageHistory).values({
        candidateId,
        stageId: newStageId,
        movedBy,
      });




      const [attachment] = await tx
        .select()
        .from(jobAssessmentAttachments)
        .where(
          and(
            eq(jobAssessmentAttachments.jobId, candidate.jobId),
            eq(jobAssessmentAttachments.triggerStageId, newStageId),
          ),
        );

      if (attachment) {
        await assessmentExecutionService.inviteCandidate(
          candidateId,
          attachment.assessmentId,
        );
      }


      if (stage.stageType === "offer") {
        const job = await jobService.getById(candidate.jobId);
        if (job) {
          let salary: number | null = null;
          let blockAutoSend = false;

          if (job.salaryType === "range" && job.salaryMin && job.salaryMax) {
            salary = (Number(job.salaryMin) + Number(job.salaryMax)) / 2;
            blockAutoSend = true; 
          } else if (job.salaryType === "fixed" && job.salaryFixed) {
            salary = Number(job.salaryFixed);
          } else if (!job.salaryType) {
            blockAutoSend = true; 
          }

          const mode =
            blockAutoSend || stage.offerMode === "auto_draft"
              ? "draft"
              : "sent";

          await offerService.create({
            candidateId: candidate.id,
            jobId: job.id,
            templateId: stage.offerTemplateId,
            salary,
            currency: job.currency,
            payFrequency: job.payFrequency,
            status: mode,
            createdBy: movedBy ?? 1,
          });
        }
      }


      if (stage.stageType === "rejection") {
      }

      return updated;
    });
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(candidates)
      .where(eq(candidates.id, id))
      .returning();
    return deleted ?? null;
  },
};
