import { eq, and, desc, asc, gte, lte, ilike, or, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  candidateInterviews,
  candidates,
  jobs,
  jobPipelineStages,
  interviewFeedback,
  interviewFeedbackRatings,
  jobScorecardCriteria,
  users,
} from "../../db/schema";
import { scoringService } from "../scoring/scoring.service";
import { cleanObject as clean } from "../../utils/object.utils";
import * as gcal from "../../shared/services/google-calendar.service";
import { mailService } from "../../shared/services/mail.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

export interface CreateInterviewInput {
  candidateId: number;
  stageId?: number;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  /** Emails of interviewers to invite (Google Calendar guests) */
  attendeeEmails?: string[];
  /** The user conducting the interview — whose connected provider (if any) generates the meeting link */
  interviewerId: number;
}

export interface UpdateInterviewInput {
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  outcome?: "pending" | "pass" | "fail";
  status?: "pending_schedule" | "scheduled" | "completed" | "cancelled";
  eventName?: string;
  eventType?: "virtual" | "onsite";
  meetingUrl?: string | null;
  meetingProvider?: "google_meet" | null;
  interviewerId?: number;
  location?: string | null;
  bodyText?: string | null;
  attendeeEmails?: string[];
}

export const interviewService = {
  /** Create an interview. If Google Calendar is connected, creates event. */
  async create(input: CreateInterviewInput, createdBy: number | null = null) {
    // Look up candidate info — also get current stage as fallback
    const [row] = await db
      .select({
        jobId: candidates.jobId,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        currentStageId: candidates.currentStageId,
        jobTitle: jobs.title,
        stageName: jobPipelineStages.name,
      })
      .from(candidates)
      .leftJoin(jobs, eq(candidates.jobId, jobs.id))
      .leftJoin(
        jobPipelineStages,
        eq(jobPipelineStages.id, input.stageId || candidates.currentStageId),
      )
      .where(eq(candidates.id, input.candidateId));

    if (!row) throw new Error("Candidate not found");

    // Use provided stageId, or fall back to candidate's current stage
    const resolvedStageId = input.stageId || row.currentStageId || 0;

    const [interview] = await db
      .insert(candidateInterviews)
      .values({
        candidateId: input.candidateId,
        stageId: resolvedStageId,
        jobId: row.jobId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        durationMinutes: input.durationMinutes ?? 30,
        notes: input.notes ?? null,
        interviewerId: input.interviewerId,
        createdBy,
      })
      .returning();

    if (!interview) throw new Error("Failed to create interview");

    // Sync to Google Calendar (service account — always available)
    if (interview.scheduledAt && interview.durationMinutes) {
      try {
        const eventId = await gcal.createCalendarEvent({
          interviewId: interview.id,
          candidateName: `${row.firstName} ${row.lastName}`,
          jobTitle: row.jobTitle ?? "",
          stageName: row.stageName ?? "",
          scheduledAt: interview.scheduledAt,
          durationMinutes: interview.durationMinutes,
          notes: interview.notes,
          attendeeEmails: input.attendeeEmails ?? [],
        });

        // Save Google event ID on the interview record
        await db
          .update(candidateInterviews)
          .set({ googleEventId: eventId })
          .where(eq(candidateInterviews.id, interview.id));

        interview.googleEventId = eventId;
      } catch (err) {
        // Don't fail the interview creation just because calendar sync failed
        logger.error(
          `Failed to sync interview ${interview.id} to Google Calendar: ${getErrorMessage(err)}`,
        );
      }
    }

    // Send interview invitation email to the candidate
    if (interview.scheduledAt && interview.durationMinutes) {
      // try {
      //   await mailService.sendInterviewInviteEmail(
      //     row.email,
      //     `${row.firstName} ${row.lastName}`,
      //     row.jobTitle ?? "",
      //     row.stageName ?? "",
      //     interview.scheduledAt.toISOString(),
      //     interview.durationMinutes,
      //   );
      // } catch (err) {
      //   logger.error(`Failed to send interview email: ${getErrorMessage(err)}`);
      // }
      if (interview.scheduledAt && interview.durationMinutes) {
        mailService
          .sendInterviewInviteEmail(
            row.email,
            `${row.firstName} ${row.lastName}`,
            row.jobTitle ?? "",
            row.stageName ?? "",
            interview.scheduledAt.toISOString(),
            interview.durationMinutes,
          )
          .catch((err: unknown) => {
            logger.error(`Failed to send interview email: ${getErrorMessage(err)}`);
          });
      }
    }

    return interview;
  },

  async getByCandidateAndStage(candidateId: number, stageId: number) {
    return db
      .select()
      .from(candidateInterviews)
      .where(
        and(
          eq(candidateInterviews.candidateId, candidateId),
          eq(candidateInterviews.stageId, stageId),
        ),
      )
      .orderBy(desc(candidateInterviews.createdAt));
  },

  async getByCandidate(candidateId: number) {
    return db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.candidateId, candidateId))
      .orderBy(desc(candidateInterviews.createdAt));
  },

  /** List all interviews with candidate + job + stage info. */
  async getAll(filters?: {
    jobId?: number;
    departmentId?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const conditions = [];

    if (filters?.jobId) {
      conditions.push(eq(candidateInterviews.jobId, filters.jobId));
    }
    if (filters?.departmentId) {
      conditions.push(eq(jobs.departmentId, filters.departmentId));
    }
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(candidates.firstName, term),
          ilike(candidates.lastName, term),
          ilike(jobs.title, term),
        )!,
      );
    }
    if (filters?.fromDate) {
      conditions.push(
        gte(candidateInterviews.scheduledAt, new Date(filters.fromDate)),
      );
    }
    if (filters?.toDate) {
      conditions.push(
        lte(candidateInterviews.scheduledAt, new Date(filters.toDate)),
      );
    }

    const rows = await db
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
        meetingProvider: candidateInterviews.meetingProvider,
        interviewerId: candidateInterviews.interviewerId,
        bodyText: candidateInterviews.bodyText,
        createdBy: candidateInterviews.createdBy,
        createdAt: candidateInterviews.createdAt,
        updatedAt: candidateInterviews.updatedAt,
        // Joined fields
        candidateName: {
          first: candidates.firstName,
          last: candidates.lastName,
        },
        candidateEmail: candidates.email,
        jobTitle: jobs.title,
        stageName: jobPipelineStages.name,
        stageType: jobPipelineStages.stageType,
      })
      .from(candidateInterviews)
      .leftJoin(candidates, eq(candidateInterviews.candidateId, candidates.id))
      .leftJoin(jobs, eq(candidateInterviews.jobId, jobs.id))
      .leftJoin(
        jobPipelineStages,
        eq(candidateInterviews.stageId, jobPipelineStages.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(candidateInterviews.scheduledAt));

    // Flatten candidateName for cleaner API response
    return rows.map((r) => ({
      ...r,
      candidateName: r.candidateName
        ? `${r.candidateName.first} ${r.candidateName.last}`
        : "Unknown",
      candidateEmail: r.candidateEmail,
    }));
  },

  async getById(id: number) {
    const [interview] = await db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.id, id));
    return interview ?? null;
  },

  /** Update an interview. If Google Calendar is connected, sync the event. */
  async update(id: number, input: UpdateInterviewInput) {
    const [existing] = await db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.id, id));

    if (!existing) return null;

    const [updated] = await db
      .update(candidateInterviews)
      .set(
        clean({
          scheduledAt: input.scheduledAt
            ? new Date(input.scheduledAt)
            : input.scheduledAt === null
              ? null
              : undefined,
          durationMinutes: input.durationMinutes,
          notes: input.notes,
          outcome: input.outcome,
          status: input.status,
          eventName: input.eventName,
          eventType: input.eventType,
          meetingUrl: input.meetingUrl,
          meetingProvider: input.meetingProvider,
          interviewerId: input.interviewerId,
          location: input.location,
          bodyText: input.bodyText,
          updatedAt: new Date(),
        }),
      )
      .where(eq(candidateInterviews.id, id))
      .returning();

    if (!updated) return null;

    // Sync to Google Calendar (service account — always available)
    if (updated.googleEventId) {
      try {
        const [row] = await db
          .select({
            firstName: candidates.firstName,
            lastName: candidates.lastName,
            jobTitle: jobs.title,
            stageName: jobPipelineStages.name,
          })
          .from(candidates)
          .leftJoin(jobs, eq(candidates.jobId, jobs.id))
          .leftJoin(
            jobPipelineStages,
            eq(jobPipelineStages.id, updated.stageId),
          )
          .where(eq(candidates.id, updated.candidateId));

        if (row && updated.scheduledAt && updated.durationMinutes) {
          await gcal.updateCalendarEvent(updated.googleEventId, {
            interviewId: updated.id,
            candidateName: `${row.firstName} ${row.lastName}`,
            jobTitle: row.jobTitle ?? "",
            stageName: row.stageName ?? "",
            scheduledAt: updated.scheduledAt,
            durationMinutes: updated.durationMinutes,
            notes: updated.notes,
            attendeeEmails: input.attendeeEmails ?? [],
            meetingUrl: updated.meetingUrl,
          });
        }
      } catch (err) {
        logger.error(
          `Failed to sync interview ${id} to Google Calendar: ${getErrorMessage(err)}`,
        );
      }
    }

    return updated;
  },

  // ── Interview Feedback ──

  /**
   * Saves an interviewer's scorecard. There is one per interviewer per interview, so submitting
   * again replaces it.
   */
  async addFeedback(
    interviewId: number,
    authorId: number,
    input: {
      content: string;
      rating?: number | null | undefined;
      recommendation?: "strong_no" | "no" | "yes" | "strong_yes" | null | undefined;
      ratings?: { criterionId: number; rating: number }[] | undefined;
    },
  ) {
    const [interview] = await db
      .select({ candidateId: candidateInterviews.candidateId, jobId: candidateInterviews.jobId })
      .from(candidateInterviews)
      .where(eq(candidateInterviews.id, interviewId));
    if (!interview) return null;

    const ratings = input.ratings ?? [];
    if (ratings.length > 0) {
      const valid = await db
        .select({ id: jobScorecardCriteria.id })
        .from(jobScorecardCriteria)
        .where(
          and(
            eq(jobScorecardCriteria.jobId, interview.jobId),
            inArray(jobScorecardCriteria.id, ratings.map((r) => r.criterionId)),
          ),
        );
      if (valid.length !== new Set(ratings.map((r) => r.criterionId)).size) {
        throw new Error("Unknown scorecard criterion");
      }
    }

    const feedback = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: interviewFeedback.id })
        .from(interviewFeedback)
        .where(
          and(
            eq(interviewFeedback.interviewId, interviewId),
            eq(interviewFeedback.authorId, authorId),
          ),
        );

      const values = {
        content: input.content,
        rating: input.rating ?? null,
        recommendation: input.recommendation ?? null,
      };
      const [row] = existing
        ? await tx
            .update(interviewFeedback)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(interviewFeedback.id, existing.id))
            .returning()
        : await tx
            .insert(interviewFeedback)
            .values({ interviewId, authorId, ...values })
            .returning();
      if (!row) return null;

      await tx
        .delete(interviewFeedbackRatings)
        .where(eq(interviewFeedbackRatings.feedbackId, row.id));
      if (ratings.length > 0) {
        await tx.insert(interviewFeedbackRatings).values(
          ratings.map((r) => ({ feedbackId: row.id, criterionId: r.criterionId, rating: r.rating })),
        );
      }
      await scoringService.recompute(interview.candidateId, tx);
      return row;
    });
    return feedback;
  },

  /**
   * The scorecards on an interview. An interviewer sees nobody else's until they have submitted
   * their own, so they are not swayed by it; managers and admins see all of them.
   */
  async getFeedback(interviewId: number, viewer: { id: number; role: string }) {
    const rows = await db
      .select({
        id: interviewFeedback.id,
        interviewId: interviewFeedback.interviewId,
        authorId: interviewFeedback.authorId,
        content: interviewFeedback.content,
        rating: interviewFeedback.rating,
        recommendation: interviewFeedback.recommendation,
        createdAt: interviewFeedback.createdAt,
        updatedAt: interviewFeedback.updatedAt,
        authorName: {
          first: users.firstName,
          last: users.lastName,
        },
      })
      .from(interviewFeedback)
      .leftJoin(users, eq(interviewFeedback.authorId, users.id))
      .where(eq(interviewFeedback.interviewId, interviewId))
      .orderBy(desc(interviewFeedback.createdAt));

    const hasSubmitted = rows.some((r) => r.authorId === viewer.id);
    const blind = viewer.role === "interviewer" && !hasSubmitted;
    const visible = blind ? [] : rows;

    const criterionRows =
      visible.length > 0
        ? await db
            .select({
              feedbackId: interviewFeedbackRatings.feedbackId,
              criterionId: interviewFeedbackRatings.criterionId,
              name: jobScorecardCriteria.name,
              rating: interviewFeedbackRatings.rating,
            })
            .from(interviewFeedbackRatings)
            .innerJoin(
              jobScorecardCriteria,
              eq(interviewFeedbackRatings.criterionId, jobScorecardCriteria.id),
            )
            .where(inArray(interviewFeedbackRatings.feedbackId, visible.map((r) => r.id)))
            .orderBy(asc(jobScorecardCriteria.position))
        : [];

    return {
      data: visible.map(({ authorName, ...r }) => ({
        ...r,
        authorName: authorName ? `${authorName.first} ${authorName.last}` : "Unknown",
        ratings: criterionRows
          .filter((c) => c.feedbackId === r.id)
          .map(({ feedbackId: _f, ...c }) => c),
      })),
      meta: { hasSubmitted, hiddenCount: blind ? rows.length : 0 },
    };
  },

  async deleteFeedback(feedbackId: number) {
    return db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(interviewFeedback)
        .where(eq(interviewFeedback.id, feedbackId))
        .returning();
      if (!deleted) return null;
      const [interview] = await tx
        .select({ candidateId: candidateInterviews.candidateId })
        .from(candidateInterviews)
        .where(eq(candidateInterviews.id, deleted.interviewId));
      if (interview) await scoringService.recompute(interview.candidateId, tx);
      return deleted;
    });
  },

  async delete(id: number) {
    const [existing] = await db
      .select()
      .from(candidateInterviews)
      .where(eq(candidateInterviews.id, id));
    if (!existing) return null;

    // Cancel the Meet event on the interviewer's calendar so attendees are notified
    if (
      existing.providerMeetingId &&
      existing.meetingProvider &&
      existing.interviewerId
    ) {
      try {
        const { integrationConnectionService } = await import(
          "../../shared/integrations/connection.service"
        );
        const { getProviderClient } = await import("../../shared/integrations/registry");
        const accessToken =
          await integrationConnectionService.getValidAccessToken(
            existing.interviewerId,
          );
        if (accessToken) {
          await getProviderClient(existing.meetingProvider).deleteMeeting(
            accessToken,
            existing.providerMeetingId,
          );
        } else {
          logger.warn(
            `Interview ${id}: cannot cancel provider meeting ${existing.providerMeetingId} — interviewer ${existing.interviewerId} has no valid connection`,
          );
        }
      } catch (err) {
        logger.error(
          `Failed to cancel provider meeting for interview ${id}: ${getErrorMessage(err)}`,
        );
      }
    }

    // Delete Google Calendar event if synced (sendUpdates:all notifies attendees)
    if (existing.googleEventId) {
      try {
        await gcal.deleteCalendarEvent(existing.googleEventId);
      } catch (err) {
        logger.error(
          `Failed to delete calendar event for interview ${id}: ${getErrorMessage(err)}`,
        );
      }
    }

    const [deleted] = await db
      .delete(candidateInterviews)
      .where(eq(candidateInterviews.id, id))
      .returning();

    // Tell the candidate their confirmed interview was cancelled
    if (deleted && existing.status === "scheduled" && existing.eventName) {
      const [candidate] = await db
        .select({
          email: candidates.email,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
        })
        .from(candidates)
        .where(eq(candidates.id, existing.candidateId));
      if (candidate) {
        mailService
          .sendInterviewCancellationEmail(
            candidate.email,
            `${candidate.firstName} ${candidate.lastName}`,
            existing.eventName,
            existing.scheduledAt,
          )
          .catch((err: unknown) => {
            logger.error(
              `Failed to send cancellation email for interview ${id}: ${getErrorMessage(err)}`,
            );
          });
      }
    }

    return deleted ?? null;
  },
};
