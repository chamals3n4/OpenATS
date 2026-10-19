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
} from "../../db/schema";
import type { Candidate } from "../../db/schema/candidates";
import { assessmentExecutionService } from "../assessment-execution/assessment-execution.service";
import { assignmentService } from "../assignment/assignment.service";
import { candidateActivityService } from "./candidate-activity.service";
import { socketService } from "../../shared/services/socket.service";
import { scoringService } from "../scoring/scoring.service";
import { toAiSummary } from "./cv-analysis.service";
import { cvExperienceAtLeast, cvMatches, cvRank, cvTextService } from "./cv-text.service";
import { resumeUploadService } from "../upload/resume-upload.service";
import { customQuestionService } from "../custom-question/custom-question.service";
import { findAnswerProblem } from "./application-answers";
import { requestResumeDeletion } from "../../queues/resume-delete/queue";
import { rejectionService } from "../rejection/rejection.service";
import { applicationReceivedEmail } from "../../shared/services/candidate-emails";
import { emailContext, sendCandidateEmail } from "../../shared/services/candidate-mailer";
import { cleanObject as clean } from "../../utils/object.utils";
import logger from "../../utils/logger";
import { hasPgCode, PG_UNIQUE_VIOLATION } from "../../utils/pg-errors";

const isPgUniqueViolation = (err: unknown) => hasPgCode(err, PG_UNIQUE_VIOLATION);

export class DuplicateApplicationError extends Error {
  constructor() {
    super("DUPLICATE_APPLICATION");
    this.name = "DuplicateApplicationError";
  }
}

/** A bulk delete matched a different number of candidates than the person confirmed. */
export class BulkDeleteCountChangedError extends Error {
  constructor(public readonly count: number) {
    super(`${count} candidates match now. Check the list and confirm again.`);
    this.name = "BulkDeleteCountChangedError";
  }
}

/** The CV named in an application is not an upload that is still waiting to be used. */
export class InvalidResumeUploadError extends Error {
  constructor() {
    super("Your CV upload has expired. Please upload it again.");
    this.name = "InvalidResumeUploadError";
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
  /** The id POST /public/upload/resume gave back for the CV. */
  resumeUploadId?: string | null | undefined;
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
  /** Only candidates whose CV shows at least this many years of work (an estimate). */
  minExperienceYears?: number | undefined;
  page?: number;
  limit?: number;
  teamUserId?: number;
}

export interface CandidateBasicUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  resumeKey?: string | null;
}

// Lists and the candidate page are told whether there is a CV, never where it is stored. The file
// itself is only served by GET /candidates/:id/resume.
const hasResume = sql<boolean>`${candidates.resumeKey} is not null`;

function nameMatches(search: string) {
  // "%" and "_" mean "anything" to LIKE. Typed into a search box they are ordinary characters, so
  // a search for "_" must not match every candidate.
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return or(
    ilike(candidates.firstName, pattern),
    ilike(candidates.lastName, pattern),
    ilike(candidates.email, pattern),
  )!;
}

/**
 * Search results, best first: someone found by name is who was being looked for, then the CVs
 * that match the search most closely.
 */
function relevanceOrder(search: string) {
  return [
    sql`${nameMatches(search)} desc`,
    sql`${cvRank(search)} desc nulls last`,
    desc(candidates.appliedAt),
  ];
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
    // By name or email, or by anything written in the CV.
    conditions.push(or(nameMatches(filters.search), cvMatches(filters.search)));
  }
  if (filters.minScore !== undefined) {
    conditions.push(sql`${candidates.totalScore} >= ${filters.minScore}`);
  }
  if (filters.minExperienceYears !== undefined) {
    conditions.push(cvExperienceAtLeast(filters.minExperienceYears));
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
  assignmentInvite?: "sent" | "skipped_active_invite" | "failed";
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
  assignmentInvitesSent: number;
  assignmentInvitesSkipped: number;
  assignmentInvitesFailed: number;
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

    const email = applicationReceivedEmail({
      ...(await emailContext("application_received")),
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      jobTitle: job.title,
    });
    await sendCandidateEmail({
      candidateId: candidate.id,
      to: candidate.email,
      kind: "application_received",
      ...email,
    });
  } catch (err) {
    logger.error("Failed to send application confirmation email:", err);
  }
}

export const candidateService = {
  async apply(jobId: number, input: CandidateApplyInput) {
    const { customAnswers, resumeUploadId, ...rest } = input;
    const normalizedEmail = rest.email.trim().toLowerCase();
    const candidateData = { ...rest, email: normalizedEmail };

    // Before anything is saved: every question that has to be answered is, and every answer and
    // option belongs to this job. See application-answers.ts.
    const problem = findAnswerProblem(
      await customQuestionService.getByJobId(jobId),
      customAnswers ?? [],
    );
    if (problem) throw new InvalidAnswerError(problem);

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

        // The applicant never names a file, only their own upload. An id that is unknown, expired
        // or already used on another application gives no file.
        const resumeKey = resumeUploadId
          ? await resumeUploadService.claim(resumeUploadId, tx)
          : undefined;
        if (resumeKey === null) throw new InvalidResumeUploadError();

        const [candidate] = await tx
          .insert(candidates)
          .values(
            clean({
              ...candidateData,
              resumeKey,
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
            // Left blank, which is allowed for a question that does not have to be answered.
            const hasText = Boolean(answer.answerText?.trim());
            if (!hasText && (answer.optionIds?.length ?? 0) === 0) continue;

            if (hasText) {
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
          hasResume: hasResume,
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
        .orderBy(
          ...(rest.sort === "score"
            ? SCORE_ORDER
            : rest.search
              ? relevanceOrder(rest.search)
              : [desc(candidates.appliedAt)]),
        )
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(candidates)
        .where(where),
    ]);

    // Where in the CV the search was found, for the rows on this page only.
    const snippets = rest.search
      ? await cvTextService.snippets(rows.map((row) => row.id), rest.search)
      : null;

    return {
      rows: snippets
        ? rows.map((row) => ({ ...row, cvSnippet: snippets.get(row.id) ?? null }))
        : rows,
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
        hasResume: hasResume,
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
      cvText: await cvTextService.getForCandidate(id),
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
    // Sent after the move is saved, because an email must never go out from inside a transaction.
    let assignmentToSend: number | null = null;

    const moved = await db.transaction(async (tx) => {
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

      assignmentToSend = await assignmentService.getForStage(candidate.jobId, newStageId);

      return { candidate: updated, stageAutomation };
    });

    if (assignmentToSend !== null) {
      try {
        const sent = await assignmentService.send(candidateId, assignmentToSend);
        moved.stageAutomation.assignmentInvite = sent?.didSendInvite ? "sent" : "skipped_active_invite";
      } catch (error) {
        logger.error(`Stage assignment for candidate ${candidateId} failed: ${error instanceof Error ? error.message : String(error)}`);
        moved.stageAutomation.assignmentInvite = "failed";
      }
    }
    return moved;
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
      assignmentInvitesSent: 0,
      assignmentInvitesSkipped: 0,
      assignmentInvitesFailed: 0,
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
        if (res.stageAutomation.assignmentInvite === "sent") result.assignmentInvitesSent += 1;
        if (res.stageAutomation.assignmentInvite === "skipped_active_invite") result.assignmentInvitesSkipped += 1;
        if (res.stageAutomation.assignmentInvite === "failed") result.assignmentInvitesFailed += 1;
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

  /** Where the CV is stored. Kept out of every other result, which only say whether there is one. */
  async getResumeFile(id: number) {
    const [candidate] = await db
      .select({
        resumeKey: candidates.resumeKey,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
      })
      .from(candidates)
      .where(eq(candidates.id, id));
    return candidate?.resumeKey ? { ...candidate, resumeKey: candidate.resumeKey } : null;
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
          resumeKey: data.resumeKey,
          updatedAt: new Date(),
        }),
      )
      .where(eq(candidates.id, id))
      .returning();

    return updated ?? null;
  },

  /**
   * Deletes the candidate and everything recorded about them (every table that names a candidate
   * cascades), then has their CV file erased from storage.
   */
  async delete(id: number) {
    const [deleted] = await db
      .delete(candidates)
      .where(eq(candidates.id, id))
      .returning({ id: candidates.id, jobId: candidates.jobId, resumeKey: candidates.resumeKey });
    if (!deleted) return null;

    await requestResumeDeletion([deleted.resumeKey]);
    return { id: deleted.id, jobId: deleted.jobId };
  },

  /** Deletes the candidates that were picked one by one. Ids that no longer exist are skipped. */
  async deleteByIds(ids: number[]) {
    if (ids.length === 0) return [];
    const deleted = await db.delete(candidates).where(inArray(candidates.id, ids)).returning({
      id: candidates.id,
      jobId: candidates.jobId,
      resumeKey: candidates.resumeKey,
    });

    await requestResumeDeletion(deleted.map((candidate) => candidate.resumeKey));
    return deleted.map(({ id, jobId }) => ({ id, jobId }));
  },

  /**
   * Deletes every candidate of one job that matches the filters: the "select all matching" of the
   * candidate list. Always one job, never the whole installation. `expectedCount` is the number
   * the person was shown and confirmed; if a different number matches now (someone applied, or
   * the search also matches CVs they did not see), nothing is deleted and they are asked again.
   */
  async deleteManyByFilters(
    jobId: number,
    filters: Omit<CandidateFilters, "page" | "limit">,
    expectedCount: number,
  ) {
    const where = buildCandidateWhere(jobId, filters);
    const deleted = await db.transaction(async (tx) => {
      const rows = await tx.delete(candidates).where(where).returning({
        id: candidates.id,
        jobId: candidates.jobId,
        resumeKey: candidates.resumeKey,
      });
      // Thrown inside the transaction, so the delete is undone.
      if (rows.length !== expectedCount) throw new BulkDeleteCountChangedError(rows.length);
      return rows;
    });

    await requestResumeDeletion(deleted.map((candidate) => candidate.resumeKey));
    return deleted.map(({ id, jobId: deletedJobId }) => ({ id, jobId: deletedJobId }));
  },
};

//TODO: implement kafka
