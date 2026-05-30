import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import { db } from "../db";
import {
  candidateInterviews,
  candidates,
  jobs,
  jobPipelineStages,
} from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";
import * as gcal from "./google-calendar.service";
import logger from "../utils/logger";

export interface CreateInterviewInput {
  candidateId: number;
  stageId?: number;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  /** Emails of interviewers to invite (Google Calendar guests) */
  attendeeEmails?: string[];
}

export interface UpdateInterviewInput {
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  notes?: string | null;
  outcome?: "pending" | "pass" | "fail";
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
    fromDate?: string;
    toDate?: string;
  }) {
    const conditions = [];

    if (filters?.jobId) {
      conditions.push(eq(candidateInterviews.jobId, filters.jobId));
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
        googleEventId: candidateInterviews.googleEventId,
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
};
