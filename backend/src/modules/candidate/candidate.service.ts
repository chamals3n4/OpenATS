import { eq, and, desc, asc, inArray, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  candidates,
  candidateCvAnalysis,
  candidateStageHistory,
  candidateCustomAnswers,
  candidateCustomAnswerSelections,
  jobPipelineStages,
  jobCustomQuestions,
  jobCustomQuestionOptions,
  jobAssessmentAttachments,
  jobHiringTeam,
  jobs,
  offers,
  candidateRejections,
  candidateInterviews,
  company,
} from "../../db/schema";
import type { Candidate } from "../../db/schema/candidates";
import { assessmentExecutionService } from "../assessment-execution/assessment-execution.service";
import { candidateActivityService } from "./candidate-activity.service";
import { socketService } from "../../shared/services/socket.service";
import { scoringService } from "../scoring/scoring.service";
import { toAiSummary } from "./cv-analysis.service";
import { rejectionService } from "../rejection/rejection.service";
import { mailService } from "../../shared/services/mail.service";
import { cleanObject as clean } from "../../utils/object.utils";
import logger from "../../utils/logger";

/** Drizzle wraps driver errors; Postgres code 23505 is often on `cause`. */
function isPgUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (
    let depth = 0;
    depth < 12 && current && typeof current === "object";
    depth++
  ) {
    if (seen.has(current)) break;
    seen.add(current);
    const code = (current as { code?: string }).code;
    if (code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export class DuplicateApplicationError extends Error {
  constructor() {
    super("DUPLICATE_APPLICATION");
    this.name = "DuplicateApplicationError";
  }
}

/** An application answer that cannot be right for its question, e.g. two picks on a single choice. */
export class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerError";
  }
}

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

export const CANDIDATE_FLAG_FILTERS = [
  "flagged",
  "knocked_out",
  "failed_assessment",
  "assessment_expired",
  "none",
] as const;
export type CandidateFlagFilter = (typeof CANDIDATE_FLAG_FILTERS)[number];

/** The SQL for each flag filter, built from the flags stored on the candidate. */
function flagCondition(flag: CandidateFlagFilter) {
  const failed = eq(candidates.assessmentPassed, false);
  switch (flag) {
    case "knocked_out":
      return eq(candidates.knockedOut, true);
    case "failed_assessment":
      return failed;
    case "assessment_expired":
      return eq(candidates.assessmentExpired, true);
    case "flagged":
      return or(eq(candidates.knockedOut, true), failed, eq(candidates.assessmentExpired, true));
    case "none":
      return sql`NOT (${candidates.knockedOut} OR coalesce(${candidates.assessmentPassed} = false, false) OR ${candidates.assessmentExpired})`;
  }
}

export interface CandidateFilters {
  stageId?: number | undefined;
  search?: string | undefined;
  status?:
    | "active"
    | "rejected"
    | "offered"
    | "hired"
    | "withdrawn"
    | undefined;
  /** "score" puts the highest total first and candidates with a knockout answer last. */
  sort?: "score" | undefined;
  /** Only candidates whose total score is at least this (0-100). Unscored candidates are left out. */
  minScore?: number | undefined;
  /** Only candidates with this flag. "none" is the ones with no flag at all. */
  flag?: CandidateFlagFilter | undefined;
  /** Only candidates scored on every part the job uses. */
  fullyScored?: boolean | undefined;
  page?: number;
  limit?: number;
  teamUserId?: number;
}

export interface CandidateBasicUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  resumeUrl?: string | null;
}

function buildCandidateWhere(
  jobId: number | undefined,
  filters: Omit<CandidateFilters, "page" | "limit">,
) {
  const conditions = [];
  if (jobId) conditions.push(eq(candidates.jobId, jobId));
  if (filters.stageId)
    conditions.push(eq(candidates.currentStageId, filters.stageId));
  if (filters.status) conditions.push(eq(candidates.status, filters.status));
  if (filters.search) {
    conditions.push(
      or(
        ilike(candidates.firstName, `%${filters.search}%`),
        ilike(candidates.lastName, `%${filters.search}%`),
        ilike(candidates.email, `%${filters.search}%`),
      ),
    );
  }
  if (filters.minScore !== undefined) {
    conditions.push(sql`${candidates.totalScore} >= ${filters.minScore}`);
  }
  if (filters.flag) conditions.push(flagCondition(filters.flag));
  if (filters.fullyScored) {
    // Scored on every part the candidate's job weights above zero. A subquery, so it also works
    // in the count query, which does not join the jobs table.
    conditions.push(sql`${candidates.scoredParts} >= (
      select (jw.score_weight_questions > 0)::int + (jw.score_weight_assessment > 0)::int
        + (jw.score_weight_rating > 0)::int + (jw.score_weight_interview > 0)::int
      from jobs jw where jw.id = ${candidates.jobId}
    )`);
  }
  if (filters.teamUserId) {
    conditions.push(
      inArray(
        candidates.jobId,
        db.select({ id: jobHiringTeam.jobId }).from(jobHiringTeam).where(eq(jobHiringTeam.userId, filters.teamUserId)),
      ),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/** The stored score parts, 0-100, null until a part exists. */
const scoreColumns = {
  questionsScore: candidates.questionsScore,
  assessmentScore: candidates.assessmentScore,
  ratingScore: candidates.ratingScore,
  interviewScore: candidates.interviewScore,
  totalScore: candidates.totalScore,
  scoredParts: candidates.scoredParts,
  knockedOut: candidates.knockedOut,
  assessmentPassed: candidates.assessmentPassed,
  assessmentExpired: candidates.assessmentExpired,
  /** How many parts the job weights above zero, so "2 of 4 scored" knows the 4. */
  weightedParts: sql<number>`(
    (${jobs.scoreWeightQuestions} > 0)::int + (${jobs.scoreWeightAssessment} > 0)::int
    + (${jobs.scoreWeightRating} > 0)::int + (${jobs.scoreWeightInterview} > 0)::int
  )`.as("weighted_parts"),
};

// Flagged candidates last, then whoever is furthest along the pipeline, then the highest score. A
// half-scored candidate at the first stage should not outrank one who has been through every stage.
const SCORE_ORDER = [
  asc(candidates.knockedOut),
  sql`${jobPipelineStages.position} desc nulls last`,
  sql`${candidates.totalScore} desc nulls last`,
  desc(candidates.appliedAt),
];

/** Returned with move-stage so the UI can toast automation outcomes. */
export type StageAutomationFlags = {
  assessmentInvite?: "sent" | "skipped_active_invite";
};

/**
 * A raw `timestamp` (no zone) subquery comes back as "2026-09-09 09:22:38.857". The column is
 * stored in UTC, so read it as UTC rather than letting the runtime guess its own zone.
 */
export function parseUtcTimestamp(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Most candidates one board request returns, a safety net rather than a page size. */
export const BOARD_MAX_CANDIDATES = 5000;

/**
 * Where `candidateId` lands in a stage's order: the other cards keep their order and the
 * candidate is inserted at `position` (clamped, or the end when omitted). Returns the ids in
 * their new order.
 */
export function insertAtPosition(
  otherIds: number[],
  candidateId: number,
  position: number | undefined,
): number[] {
  const index =
    position === undefined
      ? otherIds.length
      : Math.min(Math.max(position, 0), otherIds.length);
  const ordered = [...otherIds];
  ordered.splice(index, 0, candidateId);
  return ordered;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Renumbers a stage's cards 0..n-1 so the saved order matches what the board shows. */
async function placeInStage(
  tx: Tx,
  candidateId: number,
  stageId: number,
  position: number | undefined,
) {
  const others = await tx
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.currentStageId, stageId),
        ne(candidates.id, candidateId),
        ne(candidates.status, "rejected"),
      ),
    )
    .orderBy(asc(candidates.stagePosition), desc(candidates.appliedAt));

  const ordered = insertAtPosition(
    others.map((o) => o.id),
    candidateId,
    position,
  );

  const values = sql.join(
    ordered.map((id, index) => sql`(${id}::int, ${index}::int)`),
    sql`, `,
  );
  await tx.execute(
    sql`update candidates set stage_position = v.pos from (values ${values}) as v(id, pos) where candidates.id = v.id and candidates.stage_position is distinct from v.pos`,
  );
}

export type BulkMoveResult = {
  moved: { id: number; jobId: number }[];
  failed: { id: number; error: string }[];
  assessmentInvitesSent: number;
  assessmentInvitesSkipped: number;
};

export type MoveStageResult = {
  candidate: Candidate;
  stageAutomation: StageAutomationFlags;
};

async function sendApplicationConfirmationEmail(
  candidate: Candidate,
  jobId: number,
) {
  try {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) return;

    const [comp] = await db.select().from(company).limit(1);
    const companyName = comp?.name ?? "Talent Acquisition Team";

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const subject = `${job.title} - Thank you for your application`;
    const html = `
      <div style="font-family:sans-serif;line-height:1.8;color:#333;max-width:600px">
        <p>Dear ${candidateName},</p>
        <p>We have successfully received your application and will review it carefully.</p>
        <p>If your qualifications align with our requirements, we'll be in touch regarding the next steps. We appreciate your interest in joining our team.</p>
        <br>
        <p>Regards,<br>${companyName} Talent Acquisition Team</p>
      </div>
    `;

    await mailService.sendEmail({ to: candidate.email, subject, html });
  } catch (err) {
    logger.error("Failed to send application confirmation email:", err);
  }
}

export const candidateService = {
  async apply(jobId: number, input: CandidateApplyInput) {
    const { customAnswers, ...rest } = input;
    const normalizedEmail = rest.email.trim().toLowerCase();
    const candidateData = { ...rest, email: normalizedEmail };

    try {
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

            if (question.questionType === "radio" && (answer.optionIds?.length ?? 0) > 1) {
              throw new InvalidAnswerError(`Pick only one option for "${question.title}"`);
            }

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

        // Questions score and knockout flag, from the options they picked.
        return (await scoringService.recompute(candidate.id, tx)) ?? candidate;
      }).then((candidate) => {
        socketService.notifyCandidateApplied(jobId);
        void sendApplicationConfirmationEmail(candidate, jobId);
        return candidate;
      });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new DuplicateApplicationError();
      }
      throw err;
    }
  },

  async getAll(jobId: number | undefined, filters: CandidateFilters = {}) {
    const { page = 1, limit = 25, ...rest } = filters;
    const offset = (page - 1) * limit;

    const where = buildCandidateWhere(jobId, rest);

    const [rows, [countRow]] = await Promise.all([
      db
        .select({
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
          phone: candidates.phone,
          resumeUrl: candidates.resumeUrl,
          jobId: candidates.jobId,
          currentStageId: candidates.currentStageId,
          status: candidates.status,
          appliedAt: candidates.appliedAt,
          updatedAt: candidates.updatedAt,
          stageName: jobPipelineStages.name,
          jobTitle: jobs.title,
          ...scoreColumns,
        })
        .from(candidates)
        .leftJoin(
          jobPipelineStages,
          eq(candidates.currentStageId, jobPipelineStages.id),
        )
        .leftJoin(jobs, eq(candidates.jobId, jobs.id))
        .where(where)
        .orderBy(...(rest.sort === "score" ? SCORE_ORDER : [desc(candidates.appliedAt)]))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(where),
    ]);

    return {
      rows,
      total: countRow?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((countRow?.count ?? 0) / limit),
    };
  },

  /**
   * Everything the pipeline board needs for one job in a single light query: every candidate
   * still in the process, in the saved card order. Rejected candidates are left out.
   */
  async getBoard(jobId: number) {
    const rows = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        jobId: candidates.jobId,
        currentStageId: candidates.currentStageId,
        status: candidates.status,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        totalScore: candidates.totalScore,
        scoredParts: candidates.scoredParts,
        weightedParts: scoreColumns.weightedParts,
        knockedOut: candidates.knockedOut,
        assessmentPassed: candidates.assessmentPassed,
        assessmentExpired: candidates.assessmentExpired,
        // When the candidate entered their current stage, for "time in stage".
        stageEnteredAt: sql<string | null>`(
          select max(${candidateStageHistory.movedAt})
          from ${candidateStageHistory}
          where ${candidateStageHistory.candidateId} = ${candidates.id}
            and ${candidateStageHistory.stageId} = ${candidates.currentStageId}
        )`.as("stage_entered_at"),
      })
      .from(candidates)
      .innerJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(and(eq(candidates.jobId, jobId), ne(candidates.status, "rejected")))
      .orderBy(asc(candidates.stagePosition), desc(candidates.appliedAt))
      .limit(BOARD_MAX_CANDIDATES);
    return rows.map((r) => ({ ...r, stageEnteredAt: parseUtcTimestamp(r.stageEnteredAt) }));
  },

  async getById(id: number) {
    const [candidate] = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        jobId: candidates.jobId,
        currentStageId: candidates.currentStageId,
        status: candidates.status,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        stageName: jobPipelineStages.name,
        jobTitle: jobs.title,
        ...scoreColumns,
        weights: {
          questions: jobs.scoreWeightQuestions,
          assessment: jobs.scoreWeightAssessment,
          rating: jobs.scoreWeightRating,
          interview: jobs.scoreWeightInterview,
        },
      })
      .from(candidates)
      .leftJoin(
        jobPipelineStages,
        eq(candidates.currentStageId, jobPipelineStages.id),
      )
      .leftJoin(jobs, eq(candidates.jobId, jobs.id))
      .where(eq(candidates.id, id));

    if (!candidate) return null;

    const answers = await db
      .select({
        id: candidateCustomAnswers.id,
        candidateId: candidateCustomAnswers.candidateId,
        questionId: candidateCustomAnswers.questionId,
        answerText: candidateCustomAnswers.answerText,
        createdAt: candidateCustomAnswers.createdAt,
        questionTitle: jobCustomQuestions.title,
        questionType: jobCustomQuestions.questionType,
        questionPosition: jobCustomQuestions.position,
      })
      .from(candidateCustomAnswers)
      .leftJoin(
        jobCustomQuestions,
        eq(candidateCustomAnswers.questionId, jobCustomQuestions.id),
      )
      .where(eq(candidateCustomAnswers.candidateId, id))
      // The order of the application form, not the order rows happen to come back in.
      .orderBy(asc(jobCustomQuestions.position), asc(candidateCustomAnswers.id));

    const selections = await db
      .select({
        id: candidateCustomAnswerSelections.id,
        candidateId: candidateCustomAnswerSelections.candidateId,
        questionId: candidateCustomAnswerSelections.questionId,
        optionId: candidateCustomAnswerSelections.optionId,
        createdAt: candidateCustomAnswerSelections.createdAt,
        questionTitle: jobCustomQuestions.title,
        questionType: jobCustomQuestions.questionType,
        questionPosition: jobCustomQuestions.position,
        optionLabel: jobCustomQuestionOptions.label,
      })
      .from(candidateCustomAnswerSelections)
      .leftJoin(
        jobCustomQuestions,
        eq(candidateCustomAnswerSelections.questionId, jobCustomQuestions.id),
      )
      .leftJoin(
        jobCustomQuestionOptions,
        eq(
          candidateCustomAnswerSelections.optionId,
          jobCustomQuestionOptions.id,
        ),
      )
      .where(eq(candidateCustomAnswerSelections.candidateId, id))
      .orderBy(
        asc(jobCustomQuestions.position),
        asc(jobCustomQuestionOptions.position),
        asc(candidateCustomAnswerSelections.id),
      );

    const history = await db
      .select()
      .from(candidateStageHistory)
      .where(eq(candidateStageHistory.candidateId, id))
      .orderBy(asc(candidateStageHistory.movedAt));

    const [offer] = await db
      .select()
      .from(offers)
      .where(
        and(eq(offers.candidateId, id), eq(offers.jobId, candidate.jobId)),
      );

    const [cvRow] = await db
      .select()
      .from(candidateCvAnalysis)
      .where(eq(candidateCvAnalysis.candidateId, id));

    // Notes only: the summary, strengths and gaps, and which required skills the CV shows. Rows
    // analysed before the score and verdict were removed still hold them; they are not returned.
    const cvAnalysis = cvRow
      ? {
          status: cvRow.status,
          matchedSkills: cvRow.matchedSkills,
          missingSkills: cvRow.missingSkills,
          aiSummary: toAiSummary(cvRow.aiSummary),
          errorMessage: cvRow.errorMessage,
          updatedAt: cvRow.updatedAt,
        }
      : null;

    const rejections = await db
      .select()
      .from(candidateRejections)
      .where(eq(candidateRejections.candidateId, id))
      .orderBy(desc(candidateRejections.rejectedAt));

    const interviews = await db
      .select({
        id: candidateInterviews.id,
        candidateId: candidateInterviews.candidateId,
        stageId: candidateInterviews.stageId,
        jobId: candidateInterviews.jobId,
        scheduledAt: candidateInterviews.scheduledAt,
        durationMinutes: candidateInterviews.durationMinutes,
        notes: candidateInterviews.notes,
        outcome: candidateInterviews.outcome,
        status: candidateInterviews.status,
        eventName: candidateInterviews.eventName,
        eventType: candidateInterviews.eventType,
        meetingUrl: candidateInterviews.meetingUrl,
        bodyText: candidateInterviews.bodyText,
        timeSlots: candidateInterviews.timeSlots,
        publicToken: candidateInterviews.publicToken,
        googleEventId: candidateInterviews.googleEventId,
        createdBy: candidateInterviews.createdBy,
        createdAt: candidateInterviews.createdAt,
        updatedAt: candidateInterviews.updatedAt,
        stageType: jobPipelineStages.stageType,
      })
      .from(candidateInterviews)
      .leftJoin(
        jobPipelineStages,
        eq(candidateInterviews.stageId, jobPipelineStages.id),
      )
      .where(eq(candidateInterviews.candidateId, id))
      .orderBy(desc(candidateInterviews.createdAt));

    const activities = await candidateActivityService.getByCandidate(id);
    const ratings = await scoringService.getRatings(id);
    const interviewSpread = await scoringService.getInterviewSpread(id);

    return {
      ...candidate,
      ratings,
      interviewSpread,
      answers,
      selections,
      history,
      offer: offer ?? null,
      cvAnalysis,
      rejections,
      interviews,
      activities,
    };
  },

  async moveStage(
    candidateId: number,
    newStageId: number,
    movedBy: number | null = null,
    position?: number,
  ): Promise<MoveStageResult> {
    return await db.transaction(async (tx) => {
      const stageAutomation: StageAutomationFlags = {};

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

      // Already in this stage: no history entry and no automations, but a requested
      // position still reorders the column.
      if (candidate.currentStageId === newStageId) {
        if (position !== undefined) {
          await placeInStage(tx, candidateId, newStageId, position);
        }
        return { candidate, stageAutomation };
      }

      const nextStatus =
        candidate.status === "rejected" || candidate.status === "hired"
          ? candidate.status
          : stage.stageType === "offer"
            ? "offered"
            : "active";

      const [updated] = await tx
        .update(candidates)
        .set({
          currentStageId: newStageId,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(candidates.id, candidateId))
        .returning();

      if (!updated) throw new Error("Failed to update candidate");

      await placeInStage(tx, candidateId, newStageId, position);

      await tx.insert(candidateStageHistory).values({
        candidateId,
        stageId: newStageId,
        movedBy,
      });

      if (stage.stageType === "offer") {
        const [existingOffer] = await tx
          .select()
          .from(offers)
          .where(
            and(
              eq(offers.candidateId, candidateId),
              eq(offers.jobId, candidate.jobId),
            ),
          )
          .limit(1);

        if (!existingOffer) {
          if (!movedBy) {
            throw new Error("Unable to auto-create offer without an actor");
          }

          const [createdOffer] = await tx
            .insert(offers)
            .values({
              candidateId,
              jobId: candidate.jobId,
              status: "draft",
              createdBy: movedBy,
            })
            .returning();

          if (createdOffer) {
            await candidateActivityService.create(
              {
                candidateId,
                jobId: candidate.jobId,
                offerId: createdOffer.id,
                actorId: movedBy,
                eventType: "offer_created",
              },
              tx,
            );
          }
        }
      }

      // Assessment automation
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
        const { didSendInvite } =
          await assessmentExecutionService.inviteCandidate(
            candidateId,
            attachment.assessmentId,
          );
        stageAutomation.assessmentInvite = didSendInvite
          ? "sent"
          : "skipped_active_invite";
      }

      return { candidate: updated, stageAutomation };
    });
  },

  /**
   * Moves several candidates into one stage. Each move is its own transaction, so one candidate
   * that cannot move (wrong job, deleted) does not stop the rest. They land at the top of the
   * stage in the order given.
   */
  async moveStageBulk(
    candidateIds: number[],
    newStageId: number,
    movedBy: number | null = null,
  ): Promise<BulkMoveResult> {
    const result: BulkMoveResult = {
      moved: [],
      failed: [],
      assessmentInvitesSent: 0,
      assessmentInvitesSkipped: 0,
    };
    // Last first, so each one is placed at the top and the first id ends up on top.
    for (const id of [...candidateIds].reverse()) {
      try {
        const res = await candidateService.moveStage(id, newStageId, movedBy, 0);
        result.moved.push({ id, jobId: res.candidate.jobId });
        if (res.stageAutomation.assessmentInvite === "sent") result.assessmentInvitesSent += 1;
        if (res.stageAutomation.assessmentInvite === "skipped_active_invite") {
          result.assessmentInvitesSkipped += 1;
        }
      } catch (error) {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : "Failed to move candidate",
        });
      }
    }
    result.moved.reverse();
    return result;
  },

  async rejectCandidate(
    candidateId: number,
    input: {
      reason?: string | null;
      templateId?: number | null;
      emailStatus: "not_sent" | "draft" | "sent";
    },
    rejectedBy: number | null = null,
  ) {
    return rejectionService.reject(
      {
        candidateId,
        reason: input.reason ?? null,
        templateId: input.templateId ?? null,
        emailStatus: input.emailStatus,
      },
      rejectedBy,
    );
  },

  async updateBasicDetails(id: number, data: CandidateBasicUpdateInput) {
    const [existing] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1);

    if (!existing) return null;

    const [updated] = await db
      .update(candidates)
      .set(
        clean({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          resumeUrl: data.resumeUrl,
          updatedAt: new Date(),
        }),
      )
      .where(eq(candidates.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(candidates)
      .where(eq(candidates.id, id))
      .returning();
    return deleted ?? null;
  },

  async deleteManyByFilters(
    jobId: number | undefined,
    filters: Omit<CandidateFilters, "page" | "limit"> = {},
  ) {
    const where = buildCandidateWhere(jobId, filters);
    const deleted = await db.delete(candidates).where(where).returning({
      id: candidates.id,
      email: candidates.email,
      jobId: candidates.jobId,
    });

    return deleted;
  },
};

//TODO: implement kafka
