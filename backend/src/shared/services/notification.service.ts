import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { candidateInterviews, candidates, jobHiringTeam, jobs, notifications, users } from "../../db/schema";
import type { AuthenticatedUser } from "../auth/verify-token";
import { socketService } from "./socket.service";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";
import { pickRecipients, type NotificationType } from "./notification-types";

/** How many the bell lists. Older ones stay in the table but are not shown. */
const LIST_LIMIT = 50;

/**
 * The rows a user may still see: their own, and only while they can still see the job, or the
 * interview they were picked for. Someone taken off a hiring team stops seeing that job's names.
 */
function visibleTo(user: AuthenticatedUser) {
  const own = eq(notifications.userId, user.id);
  if (user.role === "super_admin") return own;
  return and(
    own,
    or(
      isNull(notifications.jobId),
      inArray(
        notifications.jobId,
        db.select({ id: jobHiringTeam.jobId }).from(jobHiringTeam).where(eq(jobHiringTeam.userId, user.id)),
      ),
      sql`exists (select 1 from ${candidateInterviews} ci where ci.candidate_id = ${notifications.candidateId} and ci.interviewer_id = ${user.id})`,
    ),
  );
}

/** Saves one row per active, unbanned user and tells their browsers. */
async function deliver(type: NotificationType, jobId: number, candidateId: number | null, userIds: number[]) {
  if (userIds.length === 0) return;
  const active = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(inArray(users.id, userIds), eq(users.isActive, true), or(isNull(users.banned), eq(users.banned, false))),
    );
  if (active.length === 0) return;
  await db.insert(notifications).values(active.map((u) => ({ userId: u.id, type, jobId, candidateId })));
  socketService.notifyUsers(active.map((u) => u.id));
}

export const notificationService = {
  /**
   * Tells a job's hiring team, plus `also`, about something, leaving out `exclude` (whoever did
   * it). Call after the change is committed. Never throws: a notification is never worth failing
   * what happened.
   */
  async notifyJobTeam(input: {
    type: NotificationType;
    jobId: number;
    candidateId?: number | null;
    also?: Array<number | null | undefined>;
    exclude?: number | null;
  }): Promise<void> {
    try {
      const team = await db
        .select({ userId: jobHiringTeam.userId })
        .from(jobHiringTeam)
        .where(eq(jobHiringTeam.jobId, input.jobId));
      const wanted = pickRecipients({
        team: team.map((t) => t.userId),
        also: (input.also ?? []).filter((id): id is number => typeof id === "number"),
        exclude: input.exclude ?? null,
      });
      if (wanted.length === 0) return;

      await deliver(input.type, input.jobId, input.candidateId ?? null, wanted);
    } catch (err) {
      logger.error(`Could not create "${input.type}" notifications for job ${input.jobId}: ${getErrorMessage(err)}`);
    }
  },

  /** Tells only these people, not the whole team. Never throws. */
  async notifyPeople(input: {
    type: NotificationType;
    jobId: number;
    candidateId?: number | null;
    userIds: number[];
  }): Promise<void> {
    try {
      await deliver(input.type, input.jobId, input.candidateId ?? null, [...new Set(input.userIds)]);
    } catch (err) {
      logger.error(`Could not create "${input.type}" notifications for job ${input.jobId}: ${getErrorMessage(err)}`);
    }
  },

  /** The same as notifyJobTeam, for something about one candidate, whose job is looked up. */
  async notifyCandidateTeam(input: {
    type: NotificationType;
    candidateId: number;
    also?: Array<number | null | undefined>;
    exclude?: number | null;
  }): Promise<void> {
    try {
      const [row] = await db
        .select({ jobId: candidates.jobId })
        .from(candidates)
        .where(eq(candidates.id, input.candidateId));
      if (!row) return;
      await this.notifyJobTeam({ ...input, jobId: row.jobId });
    } catch (err) {
      logger.error(
        `Could not create "${input.type}" notifications for candidate ${input.candidateId}: ${getErrorMessage(err)}`,
      );
    }
  },

  async list(user: AuthenticatedUser) {
    const where = visibleTo(user);
    const [rows, [count]] = await Promise.all([
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          candidateId: notifications.candidateId,
          jobId: notifications.jobId,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
          candidateFirstName: candidates.firstName,
          candidateLastName: candidates.lastName,
          jobTitle: jobs.title,
        })
        .from(notifications)
        .leftJoin(candidates, eq(notifications.candidateId, candidates.id))
        .leftJoin(jobs, eq(notifications.jobId, jobs.id))
        .where(where)
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(LIST_LIMIT),
      db
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(where, isNull(notifications.readAt))),
    ]);

    return {
      data: rows.map(({ candidateFirstName, candidateLastName, ...r }) => ({
        ...r,
        candidateName: candidateFirstName ? `${candidateFirstName} ${candidateLastName ?? ""}`.trim() : null,
      })),
      meta: { unread: count?.unread ?? 0 },
    };
  },

  /** Marks the given ones read, or all of them when no ids are given. Only the user's own. */
  async markRead(userId: number, ids?: number[]): Promise<void> {
    const conditions = [eq(notifications.userId, userId), isNull(notifications.readAt)];
    if (ids) {
      if (ids.length === 0) return;
      conditions.push(inArray(notifications.id, ids));
    }
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(...conditions));
  },
};
