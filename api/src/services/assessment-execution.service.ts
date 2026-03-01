import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../db";
import {
  candidateAssessmentAttempts,
  candidateAssessmentAnswers,
  candidateAssessmentAnswerSelections,
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  candidates,
} from "../db/schema";

export interface SubmitAnswerInput {
  questionId: number;
  answerText?: string | null | undefined;
  optionIds?: number[] | undefined;
}

export const assessmentExecutionService = {

  async inviteCandidate(candidateId: number, assessmentId: number, expiryDays: number = 7) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const [attempt] = await db
      .insert(candidateAssessmentAttempts)
      .values({
        candidateId,
        assessmentId,
        token,
        expiresAt,
        status: "pending",
      })
      .returning();

    return attempt;
  },


  async getAttemptsByCandidate(candidateId: number) {
    return db
      .select({
        id: candidateAssessmentAttempts.id,
        assessmentId: candidateAssessmentAttempts.assessmentId,
        token: candidateAssessmentAttempts.token,
        status: candidateAssessmentAttempts.status,
        expiresAt: candidateAssessmentAttempts.expiresAt,
        startedAt: candidateAssessmentAttempts.startedAt,
        completedAt: candidateAssessmentAttempts.completedAt,
        scorePercentage: candidateAssessmentAttempts.scorePercentage,
        passed: candidateAssessmentAttempts.passed,
        assessmentTitle: assessments.title,
      })
      .from(candidateAssessmentAttempts)
      .innerJoin(assessments, eq(candidateAssessmentAttempts.assessmentId, assessments.id))
      .where(eq(candidateAssessmentAttempts.candidateId, candidateId))
      .orderBy(desc(candidateAssessmentAttempts.createdAt));
  },


  async getAttemptByToken(token: string) {
    const [attempt] = await db
      .select({
        id: candidateAssessmentAttempts.id,
        status: candidateAssessmentAttempts.status,
        expiresAt: candidateAssessmentAttempts.expiresAt,
        startedAt: candidateAssessmentAttempts.startedAt,
        completedAt: candidateAssessmentAttempts.completedAt,
        assessment: {
          id: assessments.id,
          title: assessments.title,
          description: assessments.description,
          timeLimit: assessments.timeLimit,
        },
        candidate: {
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
        },
      })
      .from(candidateAssessmentAttempts)
      .innerJoin(assessments, eq(candidateAssessmentAttempts.assessmentId, assessments.id))
      .innerJoin(candidates, eq(candidateAssessmentAttempts.candidateId, candidates.id))
      .where(eq(candidateAssessmentAttempts.token, token));

    if (!attempt) return null;

    // fetch questions (without isCorrect flags)
    const questions = await db
      .select({
        id: assessmentQuestions.id,
        title: assessmentQuestions.title,
        description: assessmentQuestions.description,
        questionType: assessmentQuestions.questionType,
        position: assessmentQuestions.position,
        points: assessmentQuestions.points,
      })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, attempt.assessment.id))
      .orderBy(assessmentQuestions.position);

    const questionsWithOptions = await Promise.all(
      questions.map(async (q) => {
        const options = await db
          .select({
            id: assessmentQuestionOptions.id,
            label: assessmentQuestionOptions.label,
            position: assessmentQuestionOptions.position,
          })
          .from(assessmentQuestionOptions)
          .where(eq(assessmentQuestionOptions.questionId, q.id))
          .orderBy(assessmentQuestionOptions.position);

        return { ...q, options };
      }),
    );

    return { ...attempt, assessment: { ...attempt.assessment, questions: questionsWithOptions } };
  },


  async startAttempt(id: number) {
    const [attempt] = await db
      .update(candidateAssessmentAttempts)
      .set({
        status: "started",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(candidateAssessmentAttempts.id, id), eq(candidateAssessmentAttempts.status, "pending")))
      .returning();

    return attempt;
  },


  async saveAnswer(attemptId: number, input: SubmitAnswerInput) {

    return await db.transaction(async (tx) => {
      // 1. save or update answer
      const [answer] = await tx
        .insert(candidateAssessmentAnswers)
        .values({
          attemptId,
          questionId: input.questionId,
          answerText: input.answerText ?? null,
        })
        .onConflictDoUpdate({
          target: [candidateAssessmentAnswers.attemptId, candidateAssessmentAnswers.questionId],
          set: { answerText: input.answerText ?? null, updatedAt: new Date() },
        })
        .returning();

      if (!answer) throw new Error("Database failed to return the saved answer record.");

      // clear old selections and save new ones (for multiple choice)
      await tx
        .delete(candidateAssessmentAnswerSelections)
        .where(eq(candidateAssessmentAnswerSelections.answerId, answer.id));

      if (input.optionIds && input.optionIds.length > 0) {

        await tx.insert(candidateAssessmentAnswerSelections).values(
          input.optionIds.map((optionId) => ({
            answerId: answer.id,
            optionId,
          })),
        );
      }


      return answer;
    });
  },


  async completeAttempt(id: number) {
    return await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(candidateAssessmentAttempts)
        .where(eq(candidateAssessmentAttempts.id, id));

      if (!attempt || attempt.status !== "started") {
        throw new Error("Attempt is not in 'started' status");
      }

      const [assessment] = await tx.select().from(assessments).where(eq(assessments.id, attempt.assessmentId));

      if (!assessment) {
        throw new Error("Assessment not found");
      }

      const questions = await tx.select().from(assessmentQuestions).where(eq(assessmentQuestions.assessmentId, attempt.assessmentId));

      let totalScoreRaw = 0;
      let totalPossiblePoints = 0;

      for (const question of questions) {
        totalPossiblePoints += question.points;

        const [candidateAnswer] = await tx
          .select()
          .from(candidateAssessmentAnswers)
          .where(and(eq(candidateAssessmentAnswers.attemptId, id), eq(candidateAssessmentAnswers.questionId, question.id)));

        if (!candidateAnswer) continue;

        let pointsEarned = 0;

        if (question.questionType === "multiple_choice") {
          const correctOptions = await tx
            .select()
            .from(assessmentQuestionOptions)
            .where(and(eq(assessmentQuestionOptions.questionId, question.id), eq(assessmentQuestionOptions.isCorrect, true)));

          const candidateSelections = await tx
            .select()
            .from(candidateAssessmentAnswerSelections)
            .where(eq(candidateAssessmentAnswerSelections.answerId, candidateAnswer.id));

          const correctOptionIds = correctOptions.map((o) => o.id).sort();
          const candidateOptionIds = candidateSelections.map((s) => s.optionId).sort();

          const isCorrect = JSON.stringify(correctOptionIds) === JSON.stringify(candidateOptionIds);
          if (isCorrect) pointsEarned = question.points;
        } else {
          pointsEarned = 0;
        }

        await tx
          .update(candidateAssessmentAnswers)
          .set({ pointsEarned, updatedAt: new Date() })
          .where(eq(candidateAssessmentAnswers.id, candidateAnswer.id));

        totalScoreRaw += pointsEarned;
      }

      const scorePercentage = totalPossiblePoints > 0 ? (totalScoreRaw / totalPossiblePoints) * 100 : 0;
      const passed = scorePercentage >= (assessment.passScore ?? 0);

      const [completed] = await tx
        .update(candidateAssessmentAttempts)
        .set({
          status: "completed",
          completedAt: new Date(),
          scoreRaw: totalScoreRaw,
          scoreTotal: totalPossiblePoints,
          scorePercentage,
          passed,
          updatedAt: new Date(),
        })
        .where(eq(candidateAssessmentAttempts.id, id))
        .returning();

      return completed;
    });
  },
};
