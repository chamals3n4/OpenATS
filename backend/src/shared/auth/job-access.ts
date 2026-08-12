import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { jobHiringTeam } from "../../db/schema/pipeline";
import { candidates } from "../../db/schema/candidates";
import type { AuthenticatedUser } from "./verify-token";

/**
 * Per-job authorization, shared by the Socket.IO room joins and any HTTP
 * handler that needs the same rule. Authentication answers "who are you",
 * this answers "which jobs are yours" — a logged-in user is not entitled to
 * every job's chat and candidate traffic.
 *
 * `super_admin` is deliberately exempt: admins manage hiring teams, so
 * requiring membership would lock them out of the jobs they administer.
 */

/** Narrows an untrusted client-supplied room id to a usable row id. */
export function parseRoomId(value: unknown): number | null {
  const id = typeof value === "string" ? Number(value) : value;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function canAccessJob(
  user: AuthenticatedUser,
  jobId: number,
): Promise<boolean> {
  if (user.role === "super_admin") return true;

  const [member] = await db
    .select({ id: jobHiringTeam.id })
    .from(jobHiringTeam)
    .where(
      and(eq(jobHiringTeam.jobId, jobId), eq(jobHiringTeam.userId, user.id)),
    )
    .limit(1);

  return !!member;
}

/** A candidate belongs to exactly one job, so access follows that job. */
export async function canAccessCandidate(
  user: AuthenticatedUser,
  candidateId: number,
): Promise<boolean> {
  if (user.role === "super_admin") return true;

  const [candidate] = await db
    .select({ jobId: candidates.jobId })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) return false;
  return canAccessJob(user, candidate.jobId);
}
