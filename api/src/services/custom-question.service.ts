import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  jobCustomQuestions,
  jobCustomQuestionOptions,
  jobAssessmentAttachments,
  jobPipelineStages,
} from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";

export interface OptionInput {
  label: string;
  isCorrect?: boolean | undefined;
  position: number;
}

export interface CreateCustomQuestionInput {
  title: string;
  questionType: "short_answer" | "long_answer" | "checkbox" | "radio";
  isRequired?: boolean | undefined;
  position: number;
  options?: OptionInput[] | undefined;
}

export interface UpdateCustomQuestionInput {
  title?: string | undefined;
  questionType?: ("short_answer" | "long_answer" | "checkbox" | "radio") | undefined;
  isRequired?: boolean | undefined;
  position?: number | undefined;
  options?: OptionInput[] | undefined;
}

export interface AttachAssessmentInput {
  assessmentId: number;
  triggerStageId: number;
}



export const customQuestionService = {
  async getByJobId(jobId: number) {
    const questions = await db
      .select()
      .from(jobCustomQuestions)
      .where(eq(jobCustomQuestions.jobId, jobId))
      .orderBy(jobCustomQuestions.position);

    return Promise.all(
      questions.map(async (q) => {
        const options = await db
          .select()
          .from(jobCustomQuestionOptions)
          .where(eq(jobCustomQuestionOptions.questionId, q.id))
          .orderBy(jobCustomQuestionOptions.position);
        return { ...q, options };
      }),
    );
  },

  async create(jobId: number, input: CreateCustomQuestionInput) {
    const { options, ...questionData } = input;

    return await db.transaction(async (tx) => {
      const [question] = await tx
        .insert(jobCustomQuestions)
        .values(clean({ ...questionData, jobId }))
        .returning();

      if (!question) {
        throw new Error("Failed to create custom question");
      }

      if (options && options.length > 0) {
        await tx.insert(jobCustomQuestionOptions).values(
          options.map((o) => ({
            questionId: question.id,
            label: o.label,
            isCorrect: o.isCorrect ?? false,
            position: o.position,
          })),
        );
      }

      const savedOptions = await tx
        .select()
        .from(jobCustomQuestionOptions)
        .where(eq(jobCustomQuestionOptions.questionId, question.id));

      return { ...question, options: savedOptions };
    });
  },

  async update(
    jobId: number,
    questionId: number,
    input: UpdateCustomQuestionInput,
  ) {
    const { options, ...questionData } = input;

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(jobCustomQuestions)
        .set({ ...clean(questionData), updatedAt: new Date() })
        .where(
          and(
            eq(jobCustomQuestions.id, questionId),
            eq(jobCustomQuestions.jobId, jobId),
          ),
        )
        .returning();

      if (!updated) return null;

      if (options !== undefined) {
        await tx
          .delete(jobCustomQuestionOptions)
          .where(eq(jobCustomQuestionOptions.questionId, questionId));

        if (options.length > 0) {
          await tx.insert(jobCustomQuestionOptions).values(
            options.map((o) => ({
              questionId,
              label: o.label,
              isCorrect: o.isCorrect ?? false,
              position: o.position,
            })),
          );
        }
      }

      const savedOptions = await tx
        .select()
        .from(jobCustomQuestionOptions)
        .where(eq(jobCustomQuestionOptions.questionId, questionId));

      return { ...updated, options: savedOptions };
    });
  },

  async delete(jobId: number, questionId: number) {
    const [deleted] = await db
      .delete(jobCustomQuestions)
      .where(
        and(
          eq(jobCustomQuestions.id, questionId),
          eq(jobCustomQuestions.jobId, jobId),
        ),
      )
      .returning();
    return deleted ?? null;
  },

  async getAttachment(jobId: number) {
    const [attachment] = await db
      .select()
      .from(jobAssessmentAttachments)
      .where(eq(jobAssessmentAttachments.jobId, jobId));
    return attachment ?? null;
  },

  async attachAssessment(jobId: number, input: AttachAssessmentInput) {
    const [stage] = await db
      .select()
      .from(jobPipelineStages)
      .where(
        and(
          eq(jobPipelineStages.id, input.triggerStageId),
          eq(jobPipelineStages.jobId, jobId),
        ),
      );

    if (!stage) {
      throw new Error("Stage not found or does not belong to this job");
    }

    const [attachment] = await db
      .insert(jobAssessmentAttachments)
      .values(clean({
        jobId,
        assessmentId: input.assessmentId,
        triggerStageId: input.triggerStageId,
      }))
      .onConflictDoUpdate({
        target: [
          jobAssessmentAttachments.jobId,
          jobAssessmentAttachments.triggerStageId,
        ],
        set: { assessmentId: input.assessmentId },
      })
      .returning();

    if (!attachment) {
      throw new Error("Failed to attach assessment");
    }

    return attachment;
  },

  async detachAssessment(jobId: number, triggerStageId: number) {
    const [deleted] = await db
      .delete(jobAssessmentAttachments)
      .where(
        and(
          eq(jobAssessmentAttachments.jobId, jobId),
          eq(jobAssessmentAttachments.triggerStageId, triggerStageId),
        ),
      )
      .returning();
    return deleted ?? null;
  },
};
