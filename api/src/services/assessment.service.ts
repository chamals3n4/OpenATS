import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
} from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";

export interface QuestionOptionInput {
  label: string;
  isCorrect?: boolean | undefined;
  position: number;
}

export interface QuestionInput {
  title: string;
  description?: string | null | undefined;
  questionType: "short_answer" | "multiple_choice";
  points?: number | undefined;
  position: number;
  options?: QuestionOptionInput[] | undefined;
}

export interface CreateAssessmentInput {
  title: string;
  description?: string | null | undefined;
  timeLimit: number;
  passScore: number;
  createdBy: number;
  questions?: QuestionInput[] | undefined;
}

export interface UpdateAssessmentInput {
  title?: string | undefined;
  description?: string | null | undefined;
  timeLimit?: number | undefined;
  passScore?: number | undefined;
}

export interface CreateQuestionInput {
  title: string;
  description?: string | null | undefined;
  questionType: "short_answer" | "multiple_choice";
  points?: number | undefined;
  position: number;
  options?: QuestionOptionInput[] | undefined;
}

export interface UpdateQuestionInput {
  title?: string | undefined;
  description?: string | null | undefined;
  questionType?: ("short_answer" | "multiple_choice") | undefined;
  points?: number | undefined;
  position?: number | undefined;
  options?: QuestionOptionInput[] | undefined;
}



export const assessmentService = {
  async getAll() {
    return db.select().from(assessments).orderBy(assessments.createdAt);
  },

  async getById(id: number) {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, id));

    if (!assessment) return null;

    const questions = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, id))
      .orderBy(assessmentQuestions.position);

    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => {
        const options = await db
          .select()
          .from(assessmentQuestionOptions)
          .where(eq(assessmentQuestionOptions.questionId, q.id))
          .orderBy(assessmentQuestionOptions.position);
        return { ...q, options };
      }),
    );

    return { ...assessment, questions: questionsWithOptions };
  },

  async create(input: CreateAssessmentInput) {
    const { questions, ...assessmentData } = input;

    return await db.transaction(async (tx) => {
      const [assessment] = await tx
        .insert(assessments)
        .values(clean(assessmentData))
        .returning();

      if (!assessment) {
        throw new Error("Failed to create assessment");
      }

      if (questions && questions.length > 0) {
        for (const q of questions) {
          const { options, ...questionData } = q;

          const [question] = await tx
            .insert(assessmentQuestions)
            .values(clean({
              ...questionData,
              assessmentId: assessment.id,
              points: questionData.points ?? 1,
            }))
            .returning();

          if (!question) {
            throw new Error("Failed to create assessment question");
          }

          if (options && options.length > 0) {
            await tx.insert(assessmentQuestionOptions).values(
              options.map((o) => ({
                questionId: question.id,
                label: o.label,
                isCorrect: o.isCorrect ?? false,
                position: o.position,
              })),
            );
          }
        }
      }

      return assessment;
    });
  },

  async update(id: number, input: UpdateAssessmentInput) {
    const [updated] = await db
      .update(assessments)
      .set({
        ...clean(input),
        updatedAt: new Date(),
      })
      .where(eq(assessments.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(assessments)
      .where(eq(assessments.id, id))
      .returning();
    return deleted ?? null;
  },

  async createQuestion(assessmentId: number, input: CreateQuestionInput) {
    const { options, ...questionData } = input;

    return await db.transaction(async (tx) => {
      const [question] = await tx
        .insert(assessmentQuestions)
        .values(clean({
          ...questionData,
          assessmentId,
          points: questionData.points ?? 1,
        }))
        .returning();

      if (!question) {
        throw new Error("Failed to create question");
      }

      if (options && options.length > 0) {
        await tx.insert(assessmentQuestionOptions).values(
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
        .from(assessmentQuestionOptions)
        .where(eq(assessmentQuestionOptions.questionId, question.id));

      return { ...question, options: savedOptions };
    });
  },

  async updateQuestion(questionId: number, input: UpdateQuestionInput) {
    const { options, ...questionData } = input;

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(assessmentQuestions)
        .set({
          ...clean(questionData),
          updatedAt: new Date(),
        })
        .where(eq(assessmentQuestions.id, questionId))
        .returning();

      if (!updated) return null;

      if (options !== undefined) {
        await tx
          .delete(assessmentQuestionOptions)
          .where(eq(assessmentQuestionOptions.questionId, questionId));

        if (options.length > 0) {
          await tx.insert(assessmentQuestionOptions).values(
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
        .from(assessmentQuestionOptions)
        .where(eq(assessmentQuestionOptions.questionId, questionId));

      return { ...updated, options: savedOptions };
    });
  },

  async deleteQuestion(questionId: number) {
    const [deleted] = await db
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, questionId))
      .returning();
    return deleted ?? null;
  },
};
