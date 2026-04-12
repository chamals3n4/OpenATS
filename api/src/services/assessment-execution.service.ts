import { eq, and, or, gt, sql, desc, asc } from "drizzle-orm";
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

import { mailService } from "./mail.service";
import { aiGradingService } from "./ai-grading.service";
import {
  canTransitionAttemptStatus,
  clampScore,
  isObjectiveAnswerCorrect,
} from "./assessment-execution.logic";

export interface SubmitAnswerInput {
  questionId: number;
  answerText?: string | null | undefined;
  optionIds?: number[] | undefined;
}

export interface AttemptCompletionEmailContext {
  candidateEmail: string;
  candidateFirstName: string;
  assessmentTitle: string;
}

export type InviteCandidateResult = {
  attempt: typeof candidateAssessmentAttempts.$inferSelect | null;
  /** False when reusing an active attempt (no new email). */
  didSendInvite: boolean;
};

export const assessmentExecutionService = {
  async inviteCandidate(
    candidateId: number,
    assessmentId: number,
    expiryDays: number = 7,
  ): Promise<InviteCandidateResult> {
    const now = new Date();

    const [activeAttempt] = await db
      .select()
      .from(candidateAssessmentAttempts)
      .where(
        and(
          eq(candidateAssessmentAttempts.candidateId, candidateId),
          eq(candidateAssessmentAttempts.assessmentId, assessmentId),
          or(
            eq(candidateAssessmentAttempts.status, "started"),
            and(
              eq(candidateAssessmentAttempts.status, "pending"),
              gt(candidateAssessmentAttempts.expiresAt, now),
            ),
          ),
        ),
      )
      .orderBy(desc(candidateAssessmentAttempts.createdAt))
      .limit(1);

    if (activeAttempt) {
      return { attempt: activeAttempt, didSendInvite: false };
    }

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

    let didSendInvite = false;

    if (attempt) {
      const [candidate] = await db
        .select()
        .from(candidates)
        .where(eq(candidates.id, candidateId));
      const [assessment] = await db
        .select()
        .from(assessments)
        .where(eq(assessments.id, assessmentId));

      if (candidate && assessment) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const inviteUrl = `${frontendUrl}/assessment/${token}`;

        const subject = `Assessment Invitation: ${assessment.title}`;
        const html = `
          <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
            <h2>Hello ${candidate.firstName},</h2>
            <p>You have been invited to complete an assessment for your application.</p>
            <p><strong>Assessment:</strong> ${assessment.title}</p>
            <p>Please click the button below to start the assessment. This link will expire on ${expiresAt.toLocaleDateString()}.</p>
            <div style="margin: 24px 0;">
              <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Start Assessment
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${inviteUrl}">${inviteUrl}</a></p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="font-size: 14px; color: #666;">This is an automated message from OpenATS.</p>
          </div>
        `;

        await mailService.sendAssessmentInviteEmail(
          candidate.email,
          subject,
          html,
        );
        didSendInvite = true;
      }
    }

    return { attempt: attempt ?? null, didSendInvite };
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
      .innerJoin(
        assessments,
        eq(candidateAssessmentAttempts.assessmentId, assessments.id),
      )
      .where(eq(candidateAssessmentAttempts.candidateId, candidateId))
      .orderBy(desc(candidateAssessmentAttempts.createdAt));
  },

  async getAttemptReviewForCandidate(candidateId: number, attemptId: number) {
    const [attempt] = await db
      .select({
        id: candidateAssessmentAttempts.id,
        assessmentId: candidateAssessmentAttempts.assessmentId,
        status: candidateAssessmentAttempts.status,
        completedAt: candidateAssessmentAttempts.completedAt,
        scorePercentage: candidateAssessmentAttempts.scorePercentage,
        scoreRaw: candidateAssessmentAttempts.scoreRaw,
        scoreTotal: candidateAssessmentAttempts.scoreTotal,
        passed: candidateAssessmentAttempts.passed,
        assessmentTitle: assessments.title,
      })
      .from(candidateAssessmentAttempts)
      .innerJoin(
        assessments,
        eq(candidateAssessmentAttempts.assessmentId, assessments.id),
      )
      .where(
        and(
          eq(candidateAssessmentAttempts.id, attemptId),
          eq(candidateAssessmentAttempts.candidateId, candidateId),
        ),
      );

    if (!attempt) return null;

    const questions = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId))
      .orderBy(asc(assessmentQuestions.position));

    const questionRows = await Promise.all(
      questions.map(async (q) => {
        const options = await db
          .select()
          .from(assessmentQuestionOptions)
          .where(eq(assessmentQuestionOptions.questionId, q.id))
          .orderBy(asc(assessmentQuestionOptions.position));

        const correctLabels = options
          .filter((o) => o.isCorrect)
          .map((o) => o.label);

        const [answerRow] = await db
          .select()
          .from(candidateAssessmentAnswers)
          .where(
            and(
              eq(candidateAssessmentAnswers.attemptId, attemptId),
              eq(candidateAssessmentAnswers.questionId, q.id),
            ),
          );

        let selectedLabels: string[] = [];
        let aiFeedback: string | null = null;
        let pointsEarned: number | null = null;
        let candidateAnswerText: string | null = null;

        if (answerRow) {
          pointsEarned =
            answerRow.pointsEarned != null
              ? Number(answerRow.pointsEarned)
              : null;
          candidateAnswerText = answerRow.answerText ?? null;
          aiFeedback = answerRow.aiFeedback ?? null;

          const selections = await db
            .select({ label: assessmentQuestionOptions.label })
            .from(candidateAssessmentAnswerSelections)
            .innerJoin(
              assessmentQuestionOptions,
              eq(
                candidateAssessmentAnswerSelections.optionId,
                assessmentQuestionOptions.id,
              ),
            )
            .where(
              eq(candidateAssessmentAnswerSelections.answerId, answerRow.id),
            )
            .orderBy(asc(assessmentQuestionOptions.position));

          selectedLabels = selections.map((s) => s.label);
        }

        const maxPoints = Number(q.points);
        return {
          questionId: q.id,
          title: q.title,
          description: q.description,
          questionType: q.questionType,
          maxPoints,
          pointsEarned,
          candidateAnswerText,
          selectedOptionLabels: selectedLabels,
          correctOptionLabels: correctLabels,
          aiFeedback,
        };
      }),
    );

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        completedAt: attempt.completedAt,
        scorePercentage:
          attempt.scorePercentage != null
            ? Number(attempt.scorePercentage)
            : null,
        scoreRaw: attempt.scoreRaw != null ? Number(attempt.scoreRaw) : null,
        scoreTotal:
          attempt.scoreTotal != null ? Number(attempt.scoreTotal) : null,
        passed: attempt.passed,
        assessmentTitle: attempt.assessmentTitle,
      },
      questions: questionRows,
    };
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
      .innerJoin(
        assessments,
        eq(candidateAssessmentAttempts.assessmentId, assessments.id),
      )
      .innerJoin(
        candidates,
        eq(candidateAssessmentAttempts.candidateId, candidates.id),
      )
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

    return {
      ...attempt,
      assessment: { ...attempt.assessment, questions: questionsWithOptions },
    };
  },

  async getAttemptCompletionEmailContext(
    attemptId: number,
  ): Promise<AttemptCompletionEmailContext | null> {
    const [result] = await db
      .select({
        candidateEmail: candidates.email,
        candidateFirstName: candidates.firstName,
        assessmentTitle: assessments.title,
      })
      .from(candidateAssessmentAttempts)
      .innerJoin(
        candidates,
        eq(candidateAssessmentAttempts.candidateId, candidates.id),
      )
      .innerJoin(
        assessments,
        eq(candidateAssessmentAttempts.assessmentId, assessments.id),
      )
      .where(eq(candidateAssessmentAttempts.id, attemptId));

    return result ?? null;
  },

  async startAttempt(id: number) {
    // Pure rule check (behavior unchanged; DB WHERE is authoritative)
    if (!canTransitionAttemptStatus("pending", "started")) {
      throw new Error("Invalid attempt status transition");
    }
    const [attempt] = await db
      .update(candidateAssessmentAttempts)
      .set({
        status: "started",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(candidateAssessmentAttempts.id, id),
          eq(candidateAssessmentAttempts.status, "pending"),
        ),
      )
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
          target: [
            candidateAssessmentAnswers.attemptId,
            candidateAssessmentAnswers.questionId,
          ],
          set: { answerText: input.answerText ?? null, updatedAt: new Date() },
        })
        .returning();

      if (!answer)
        throw new Error("Database failed to return the saved answer record.");

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

      const [assessment] = await tx
        .select()
        .from(assessments)
        .where(eq(assessments.id, attempt.assessmentId));

      if (!assessment) {
        throw new Error("Assessment not found");
      }

      const questions = await tx
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId));

      let totalScoreRaw = 0;
      let totalPossiblePoints = 0;

      for (const question of questions) {
        const questionPoints = Number(question.points);
        totalPossiblePoints += questionPoints;

        const [candidateAnswer] = await tx
          .select()
          .from(candidateAssessmentAnswers)
          .where(
            and(
              eq(candidateAssessmentAnswers.attemptId, id),
              eq(candidateAssessmentAnswers.questionId, question.id),
            ),
          );

        if (!candidateAnswer) continue;

        let pointsEarned = 0;
        let aiFeedback: string | null = null;

        if (
          question.questionType === "multiple_choice" ||
          question.questionType === "radio" ||
          question.questionType === "checkbox"
        ) {
          const correctOptions = await tx
            .select()
            .from(assessmentQuestionOptions)
            .where(
              and(
                eq(assessmentQuestionOptions.questionId, question.id),
                eq(assessmentQuestionOptions.isCorrect, true),
              ),
            );

          const candidateSelections = await tx
            .select()
            .from(candidateAssessmentAnswerSelections)
            .where(
              eq(
                candidateAssessmentAnswerSelections.answerId,
                candidateAnswer.id,
              ),
            );

          const correctOptionIds = correctOptions.map((o) => o.id).sort();
          const candidateOptionIds = candidateSelections
            .map((s) => s.optionId)
            .sort();

          const isCorrect = isObjectiveAnswerCorrect(
            correctOptionIds,
            candidateOptionIds,
          );
          if (isCorrect) pointsEarned = questionPoints;
          aiFeedback = null;
        } else if (question.questionType === "short_answer") {
          const answerText = candidateAnswer.answerText?.trim() ?? "";
          if (!answerText) {
            pointsEarned = 0;
            aiFeedback = null;
          } else {
            const rubric = question.description?.startsWith("[AI_GRADED]")
              ? question.description.replace("[AI_GRADED]", "").trim()
              : "Award points for correctness, technical depth, and practical problem-solving clarity.";

            const grade = await aiGradingService.gradeShortAnswer({
              question: question.title,
              rubric,
              answer: answerText,
              maxPoints: questionPoints,
            });
            pointsEarned = grade.score;
            aiFeedback = grade.feedback ?? null;
          }
        } else {
          pointsEarned = 0;
          aiFeedback = null;
        }

        pointsEarned = clampScore(pointsEarned, questionPoints);

        await tx
          .update(candidateAssessmentAnswers)
          .set({
            pointsEarned,
            aiFeedback,
            updatedAt: new Date(),
          })
          .where(eq(candidateAssessmentAnswers.id, candidateAnswer.id));

        totalScoreRaw += pointsEarned;
      }

      const scorePercentage =
        totalPossiblePoints > 0
          ? (totalScoreRaw / totalPossiblePoints) * 100
          : 0;
      const passed = scorePercentage >= Number(assessment.passScore ?? 0);

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
