import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  candidates,
  candidateAssessmentAttempts,
  candidateCustomAnswerSelections,
  candidateInterviews,
  candidateRatings,
  interviewFeedback,
  interviewFeedbackRatings,
  jobAssessmentAttachments,
  jobCustomQuestionOptions,
  jobCustomQuestions,
  jobScorecardCriteria,
  jobs,
} from "../../db/schema";
import {
  computeInterviewScore,
  computeQuestionsScore,
  computeRatingScore,
  computeTotal,
  type ScoreWeights,
} from "./scoring";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export const DEFAULT_PASS_MARK = 60;

const sqlPassed = (passMark: number) =>
  sql<boolean>`${candidateAssessmentAttempts.scorePercentage} >= ${passMark}`;

export const weightsOf = (job: {
  scoreWeightQuestions: number;
  scoreWeightAssessment: number;
  scoreWeightRating: number;
  scoreWeightInterview: number;
}): ScoreWeights => ({
  questions: job.scoreWeightQuestions,
  assessment: job.scoreWeightAssessment,
  rating: job.scoreWeightRating,
  interview: job.scoreWeightInterview,
});

export const scoringService = {
  /** Rebuilds a candidate's stored score parts from their answers, ratings, attempts and scorecards. */
  async recompute(candidateId: number, executor: Executor = db) {
    const [row] = await executor
      .select({ candidate: candidates, job: jobs })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(candidates.id, candidateId));
    if (!row) return null;
    const { candidate, job } = row;

    // Questions
    const questionRows = await executor
      .select()
      .from(jobCustomQuestions)
      .where(eq(jobCustomQuestions.jobId, job.id));
    const questionIds = questionRows.map((q) => q.id);
    const optionRows =
      questionIds.length > 0
        ? await executor
            .select()
            .from(jobCustomQuestionOptions)
            .where(inArray(jobCustomQuestionOptions.questionId, questionIds))
        : [];
    const selectionRows = await executor
      .select()
      .from(candidateCustomAnswerSelections)
      .where(eq(candidateCustomAnswerSelections.candidateId, candidateId));

    const selected = new Map<number, number[]>();
    for (const s of selectionRows) {
      selected.set(s.questionId, [...(selected.get(s.questionId) ?? []), s.optionId]);
    }
    const questions = computeQuestionsScore(
      questionRows.map((q) => ({
        id: q.id,
        questionType: q.questionType,
        options: optionRows
          .filter((o) => o.questionId === q.id)
          .map((o) => ({ id: o.id, points: o.points, isKnockout: o.isKnockout })),
      })),
      selected,
    );

    // Assessment: the latest finished attempt
    const [attempt] = await executor
      .select()
      .from(candidateAssessmentAttempts)
      .where(
        and(
          eq(candidateAssessmentAttempts.candidateId, candidateId),
          eq(candidateAssessmentAttempts.status, "completed"),
        ),
      )
      .orderBy(desc(candidateAssessmentAttempts.completedAt))
      .limit(1);
    const assessmentScore =
      attempt?.scorePercentage != null ? Number(attempt.scorePercentage) : null;

    // Rating
    const ratingRows = await executor
      .select({ rating: candidateRatings.rating })
      .from(candidateRatings)
      .where(eq(candidateRatings.candidateId, candidateId));

    // Interview scorecards
    const feedbackRows = await executor
      .select({ id: interviewFeedback.id, rating: interviewFeedback.rating })
      .from(interviewFeedback)
      .innerJoin(
        candidateInterviews,
        eq(interviewFeedback.interviewId, candidateInterviews.id),
      )
      .where(eq(candidateInterviews.candidateId, candidateId));
    const feedbackIds = feedbackRows.map((f) => f.id);
    const criterionRows =
      feedbackIds.length > 0
        ? await executor
            .select()
            .from(interviewFeedbackRatings)
            .where(inArray(interviewFeedbackRatings.feedbackId, feedbackIds))
        : [];

    const scores = {
      questions: questions.score,
      assessment: assessmentScore,
      rating: computeRatingScore(ratingRows.map((r) => r.rating)),
      interview: computeInterviewScore(
        feedbackRows.map((f) => ({
          overall: f.rating,
          criterionRatings: criterionRows
            .filter((c) => c.feedbackId === f.id)
            .map((c) => c.rating),
        })),
      ),
    };
    const { total, scoredParts } = computeTotal(scores, weightsOf(job));

    const [updated] = await executor
      .update(candidates)
      .set({
        questionsScore: scores.questions,
        assessmentScore: scores.assessment,
        ratingScore: scores.rating,
        interviewScore: scores.interview,
        totalScore: total,
        scoredParts,
        knockedOut: questions.knockedOut,
        assessmentPassed: attempt?.passed ?? null,
      })
      .where(eq(candidates.id, candidateId))
      .returning();
    return updated ?? null;
  },

  /** After a job's weights change every candidate's total moves. */
  async recomputeJob(jobId: number) {
    const rows = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.jobId, jobId));
    for (const { id } of rows) await scoringService.recompute(id);
  },

  /** After scoring options or an attachment's pass mark change, re-grade the job's candidates. */
  async regradeJob(jobId: number) {
    const attachments = await db
      .select()
      .from(jobAssessmentAttachments)
      .where(eq(jobAssessmentAttachments.jobId, jobId));
    for (const a of attachments) {
      await db
        .update(candidateAssessmentAttempts)
        .set({ passed: sqlPassed(a.passMark) })
        .where(
          and(
            eq(candidateAssessmentAttempts.assessmentId, a.assessmentId),
            eq(candidateAssessmentAttempts.status, "completed"),
            inArray(
              candidateAssessmentAttempts.candidateId,
              db.select({ id: candidates.id }).from(candidates).where(eq(candidates.jobId, jobId)),
            ),
          ),
        );
    }
    await scoringService.recomputeJob(jobId);
  },

  // ── Scorecard criteria ──

  async getCriteria(jobId: number) {
    return db
      .select()
      .from(jobScorecardCriteria)
      .where(eq(jobScorecardCriteria.jobId, jobId))
      .orderBy(asc(jobScorecardCriteria.position));
  },

  /**
   * Replaces a job's criteria. Rows with an id are renamed and reordered so scorecards already
   * submitted keep their scores; rows without one are new; anything left out is removed.
   */
  async setCriteria(jobId: number, input: { id?: number | undefined; name: string }[]) {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: jobScorecardCriteria.id })
        .from(jobScorecardCriteria)
        .where(eq(jobScorecardCriteria.jobId, jobId));
      const existingIds = new Set(existing.map((e) => e.id));
      const keep = new Set(input.flatMap((c) => (c.id && existingIds.has(c.id) ? [c.id] : [])));

      const removed = [...existingIds].filter((id) => !keep.has(id));
      if (removed.length > 0) {
        await tx.delete(jobScorecardCriteria).where(inArray(jobScorecardCriteria.id, removed));
      }

      for (const [index, c] of input.entries()) {
        if (c.id && existingIds.has(c.id)) {
          await tx
            .update(jobScorecardCriteria)
            .set({ name: c.name, position: index + 1 })
            .where(eq(jobScorecardCriteria.id, c.id));
        } else {
          await tx
            .insert(jobScorecardCriteria)
            .values({ jobId, name: c.name, position: index + 1 });
        }
      }
    });
    return scoringService.getCriteria(jobId);
  },

  // ── Ratings (stars after reading the CV) ──

  async setRating(candidateId: number, userId: number, rating: number | null) {
    if (rating === null) {
      await db
        .delete(candidateRatings)
        .where(and(eq(candidateRatings.candidateId, candidateId), eq(candidateRatings.userId, userId)));
    } else {
      await db
        .insert(candidateRatings)
        .values({ candidateId, userId, rating })
        .onConflictDoUpdate({
          target: [candidateRatings.candidateId, candidateRatings.userId],
          set: { rating, updatedAt: new Date() },
        });
    }
    return scoringService.recompute(candidateId);
  },

  async getRatings(candidateId: number) {
    return db
      .select({ userId: candidateRatings.userId, rating: candidateRatings.rating })
      .from(candidateRatings)
      .where(eq(candidateRatings.candidateId, candidateId));
  },
};
