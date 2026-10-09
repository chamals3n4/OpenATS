import { eq, and, or, gt, lt, sql, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../db";
import {
  candidateAssessmentAttempts,
  candidateAssessmentAnswers,
  candidateAssessmentAnswerSelections,
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  candidates,
} from "../../db/schema";

import { DEFAULT_PASS_MARK, passMarkFor, scoringService } from "../scoring/scoring.service";
import { gradeChoiceQuestion, hasPassed, isWrittenType, scorePercentage } from "./grading";
import { mailService } from "../../shared/services/mail.service";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A grading request that cannot be honoured, with the HTTP status to answer with. */
export class GradingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GradingError";
  }
}

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

  async getAttemptCompletionEmailContext(attemptId: number): Promise<AttemptCompletionEmailContext | null> {
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

  /**
   * Finishes an attempt. Choice questions are graded now. A written answer waits for a person
   * to grade it, and until every one is graded the attempt has no score or pass/fail result, so
   * the candidate's total ignores the Assessment part rather than counting it as zero.
   */
  async completeAttempt(id: number) {
    return await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(candidateAssessmentAttempts)
        .where(eq(candidateAssessmentAttempts.id, id));

      if (!attempt || attempt.status !== "started") {
        throw new Error("Attempt is not in 'started' status");
      }

      const questions = await tx
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId));

      for (const question of questions) {
        const [answer] = await tx
          .select()
          .from(candidateAssessmentAnswers)
          .where(
            and(
              eq(candidateAssessmentAnswers.attemptId, id),
              eq(candidateAssessmentAnswers.questionId, question.id),
            ),
          );
        if (!answer) continue;

        let pointsEarned: number | null;
        if (isWrittenType(question.questionType)) {
          // Blank answers earn nothing; a real one waits for review.
          pointsEarned = answer.answerText?.trim() ? null : 0;
        } else {
          const correct = await tx
            .select({ id: assessmentQuestionOptions.id })
            .from(assessmentQuestionOptions)
            .where(
              and(
                eq(assessmentQuestionOptions.questionId, question.id),
                eq(assessmentQuestionOptions.isCorrect, true),
              ),
            );
          const picked = await tx
            .select({ optionId: candidateAssessmentAnswerSelections.optionId })
            .from(candidateAssessmentAnswerSelections)
            .where(eq(candidateAssessmentAnswerSelections.answerId, answer.id));
          pointsEarned = gradeChoiceQuestion(
            Number(question.points),
            correct.map((o) => o.id),
            picked.map((s) => s.optionId),
          );
        }

        await tx
          .update(candidateAssessmentAnswers)
          .set({ pointsEarned, updatedAt: new Date() })
          .where(eq(candidateAssessmentAnswers.id, answer.id));
      }

      await tx
        .update(candidateAssessmentAttempts)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(candidateAssessmentAttempts.id, id));

      return assessmentExecutionService.finalizeIfGraded(tx, id);
    });
  },

  /**
   * Writes the score and pass/fail once nothing is waiting for a person to grade, then updates
   * the candidate's total. Returns the attempt either way; its score stays null while pending.
   */
  async finalizeIfGraded(tx: Tx, attemptId: number) {
    const [attempt] = await tx
      .select()
      .from(candidateAssessmentAttempts)
      .where(eq(candidateAssessmentAttempts.id, attemptId));
    if (!attempt) throw new Error("Attempt not found");

    const questions = await tx
      .select({ id: assessmentQuestions.id, points: assessmentQuestions.points })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId));
    const answers = await tx
      .select({
        questionId: candidateAssessmentAnswers.questionId,
        pointsEarned: candidateAssessmentAnswers.pointsEarned,
      })
      .from(candidateAssessmentAnswers)
      .where(eq(candidateAssessmentAnswers.attemptId, attemptId));

    const scoreTotal = questions.reduce((sum, q) => sum + Number(q.points), 0);

    if (answers.some((a) => a.pointsEarned === null)) {
      const [pending] = await tx
        .update(candidateAssessmentAttempts)
        .set({
          scoreRaw: null,
          scoreTotal,
          scorePercentage: null,
          passed: null,
          updatedAt: new Date(),
        })
        .where(eq(candidateAssessmentAttempts.id, attemptId))
        .returning();
      await scoringService.recompute(attempt.candidateId, tx);
      return pending;
    }

    const scoreRaw = answers.reduce((sum, a) => sum + Number(a.pointsEarned), 0);
    const percentage = scorePercentage(scoreRaw, scoreTotal);

    const [owner] = await tx
      .select({ jobId: candidates.jobId })
      .from(candidates)
      .where(eq(candidates.id, attempt.candidateId));
    const passMark = owner
      ? await passMarkFor(tx, owner.jobId, attempt.assessmentId)
      : DEFAULT_PASS_MARK;

    const [done] = await tx
      .update(candidateAssessmentAttempts)
      .set({
        scoreRaw,
        scoreTotal,
        scorePercentage: percentage,
        passed: hasPassed(percentage, passMark),
        updatedAt: new Date(),
      })
      .where(eq(candidateAssessmentAttempts.id, attemptId))
      .returning();
    await scoringService.recompute(attempt.candidateId, tx);
    return done;
  },

  /**
   * Marks invitations whose link ran out unused as expired, and re-scores those candidates, so a
   * test that was never taken counts as 0 instead of being quietly left out. Safe to run often and
   * from several servers at once.
   */
  async expireStaleInvites(now: Date = new Date()): Promise<number> {
    const expired = await db
      .update(candidateAssessmentAttempts)
      .set({ status: "expired", updatedAt: now })
      .where(
        and(
          eq(candidateAssessmentAttempts.status, "pending"),
          lt(candidateAssessmentAttempts.expiresAt, now),
        ),
      )
      .returning({ candidateId: candidateAssessmentAttempts.candidateId });
    for (const candidateId of new Set(expired.map((e) => e.candidateId))) {
      await scoringService.recompute(candidateId);
    }
    return expired.length;
  },

  /** Whose attempt this is, so a request about it can be checked against that candidate's job. */
  async getAttemptOwner(attemptId: number): Promise<{ candidateId: number; jobId: number } | null> {
    const [row] = await db
      .select({ candidateId: candidateAssessmentAttempts.candidateId, jobId: candidates.jobId })
      .from(candidateAssessmentAttempts)
      .innerJoin(candidates, eq(candidateAssessmentAttempts.candidateId, candidates.id))
      .where(eq(candidateAssessmentAttempts.id, attemptId));
    return row ?? null;
  },

  /** A reviewer's points for one written answer, from 0 up to the question's points. */
  async gradeWrittenAnswer(attemptId: number, questionId: number, points: number) {
    return await db.transaction(async (tx) => {
      const [attempt] = await tx
        .select()
        .from(candidateAssessmentAttempts)
        .where(eq(candidateAssessmentAttempts.id, attemptId));
      if (!attempt) throw new GradingError("Attempt not found", 404);
      if (attempt.status !== "completed") {
        throw new GradingError("Only a completed attempt can be graded", 400);
      }

      const [question] = await tx
        .select()
        .from(assessmentQuestions)
        .where(
          and(
            eq(assessmentQuestions.id, questionId),
            eq(assessmentQuestions.assessmentId, attempt.assessmentId),
          ),
        );
      if (!question) throw new GradingError("Question not found", 404);
      if (!isWrittenType(question.questionType)) {
        throw new GradingError("Only written answers are graded by hand", 400);
      }
      if (points < 0 || points > Number(question.points)) {
        throw new GradingError(`Points must be between 0 and ${Number(question.points)}`, 400);
      }

      const updated = await tx
        .update(candidateAssessmentAnswers)
        .set({ pointsEarned: points, updatedAt: new Date() })
        .where(
          and(
            eq(candidateAssessmentAnswers.attemptId, attemptId),
            eq(candidateAssessmentAnswers.questionId, questionId),
          ),
        )
        .returning({ id: candidateAssessmentAnswers.id });
      if (updated.length === 0) throw new GradingError("There is no answer to grade", 404);

      return assessmentExecutionService.finalizeIfGraded(tx, attemptId);
    });
  },

  async getAttemptResults(attemptId: number) {
    const [attempt] = await db
      .select({
        id: candidateAssessmentAttempts.id,
        candidateId: candidateAssessmentAttempts.candidateId,
        assessmentId: candidateAssessmentAttempts.assessmentId,
        status: candidateAssessmentAttempts.status,
        startedAt: candidateAssessmentAttempts.startedAt,
        completedAt: candidateAssessmentAttempts.completedAt,
        scoreRaw: candidateAssessmentAttempts.scoreRaw,
        scoreTotal: candidateAssessmentAttempts.scoreTotal,
        scorePercentage: candidateAssessmentAttempts.scorePercentage,
        passed: candidateAssessmentAttempts.passed,
        assessmentTitle: assessments.title,
        assessmentDescription: assessments.description,
        candidateName: sql<string>`concat(${candidates.firstName}, ' ', ${candidates.lastName})`,
        candidateEmail: candidates.email,
      })
      .from(candidateAssessmentAttempts)
      .innerJoin(assessments, eq(candidateAssessmentAttempts.assessmentId, assessments.id))
      .innerJoin(candidates, eq(candidateAssessmentAttempts.candidateId, candidates.id))
      .where(eq(candidateAssessmentAttempts.id, attemptId));

    if (!attempt) return null;

    const questions = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId))
      .orderBy(assessmentQuestions.position);

    const options = await db
      .select({
        id: assessmentQuestionOptions.id,
        questionId: assessmentQuestionOptions.questionId,
        label: assessmentQuestionOptions.label,
        isCorrect: assessmentQuestionOptions.isCorrect,
        position: assessmentQuestionOptions.position,
      })
      .from(assessmentQuestionOptions)
      .innerJoin(assessmentQuestions, eq(assessmentQuestionOptions.questionId, assessmentQuestions.id))
      .where(eq(assessmentQuestions.assessmentId, attempt.assessmentId))
      .orderBy(assessmentQuestionOptions.position);

    const answers = await db
      .select()
      .from(candidateAssessmentAnswers)
      .where(eq(candidateAssessmentAnswers.attemptId, attemptId));

    const selections = await db
      .select({
        answerId: candidateAssessmentAnswerSelections.answerId,
        optionId: candidateAssessmentAnswerSelections.optionId,
      })
      .from(candidateAssessmentAnswerSelections)
      .innerJoin(
        candidateAssessmentAnswers,
        eq(candidateAssessmentAnswerSelections.answerId, candidateAssessmentAnswers.id)
      )
      .where(eq(candidateAssessmentAnswers.attemptId, attemptId));

    const formattedQuestions = questions.map((q) => {
      const qOptions = options
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          label: o.label,
          isCorrect: o.isCorrect,
        }));

      const candAnswer = answers.find((ans) => ans.questionId === q.id);
      const candSelections = candAnswer
        ? selections
            .filter((sel) => sel.answerId === candAnswer.id)
            .map((sel) => sel.optionId)
        : [];

      return {
        id: q.id,
        title: q.title,
        description: q.description,
        questionType: q.questionType,
        points: q.points,
        position: q.position,
        options: qOptions,
        answer: candAnswer
          ? {
              answerText: candAnswer.answerText,
              selectedOptionIds: candSelections,
              pointsEarned: candAnswer.pointsEarned,
            }
          : null,
      };
    });

    // Written answers still waiting for a person to grade them.
    const pendingReview = formattedQuestions.filter(
      (q) => isWrittenType(q.questionType) && q.answer && q.answer.pointsEarned === null,
    ).length;

    return {
      attempt,
      pendingReview,
      questions: formattedQuestions,
    };
  },
};
