import { eq, and, desc, asc, gte, lte, ilike, or } from "drizzle-orm";
import { db } from "../../db";
import {
  candidateInterviews,
  candidates,
  jobs,
  jobPipelineStages,
  interviewFeedback,
  departments,
  users,
} from "../../db/schema";
import { cleanObject as clean } from "../../utils/object.utils";
import * as gcal from "../../shared/services/google-calendar.service";
import { mailService } from "../../shared/services/mail.service";
import logger from "../../utils/logger";

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
      } catch (err: any) {
        // Don't fail the interview creation just because calendar sync failed
        logger.error(
          `Failed to sync interview ${interview.id} to Google Calendar: ${err.message}`,
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
      // } catch (err: any) {
      //   logger.error(`Failed to send interview email: ${err.message}`);
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
          .catch((err: any) => {
            logger.error(`Failed to send interview email: ${err.message}`);
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
      } catch (err: any) {
        logger.error(
          `Failed to sync interview ${id} to Google Calendar: ${err.message}`,
        );
      }
    }

    return updated;
  },

  // ── Interview Feedback ──

  async addFeedback(
    interviewId: number,
    authorId: number,
    content: string,
    rating?: number | null,
  ) {
    const [feedback] = await db
      .insert(interviewFeedback)
      .values({
        interviewId,
        authorId,
        content,
        rating: rating ?? null,
      })
      .returning();
    return feedback ?? null;
  },

  async getFeedback(interviewId: number) {
    const rows = await db
      .select({
        id: interviewFeedback.id,
        interviewId: interviewFeedback.interviewId,
        content: interviewFeedback.content,
        rating: interviewFeedback.rating,
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

    return rows.map((r) => ({
      ...r,
      authorName: r.authorName
        ? `${r.authorName.first} ${r.authorName.last}`
        : "Unknown",
    }));
  },

  async deleteFeedback(feedbackId: number) {
    const [deleted] = await db
      .delete(interviewFeedback)
      .where(eq(interviewFeedback.id, feedbackId))
      .returning();
    return deleted ?? null;
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
      } catch (err: any) {
        logger.error(
          `Failed to cancel provider meeting for interview ${id}: ${err?.message}`,
        );
      }
    }

    // Delete Google Calendar event if synced (sendUpdates:all notifies attendees)
    if (existing.googleEventId) {
      try {
        await gcal.deleteCalendarEvent(existing.googleEventId);
      } catch (err: any) {
        logger.error(
          `Failed to delete calendar event for interview ${id}: ${err?.message}`,
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
          .catch((err: any) => {
            logger.error(
              `Failed to send cancellation email for interview ${id}: ${err?.message}`,
            );
          });
      }
    }

    return deleted ?? null;
  },
};
