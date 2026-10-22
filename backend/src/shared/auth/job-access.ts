import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { jobHiringTeam } from "../../db/schema/pipeline";
import { candidates } from "../../db/schema/candidates";
import { candidateInterviews } from "../../db/schema/interviews";
import { offers } from "../../db/schema/offers";
import type { AuthenticatedUser } from "./verify-token";

// Per-job authorization, shared by the sockets and the HTTP middleware. There are two rules.
//
// Who may see and work on a job's candidates (canViewJob, canViewCandidate):
//   - super admins: every job.
//   - hiring managers and interviewers: only jobs where they are on the hiring team (whoever
//     creates a job is added to it). What they may change on those jobs is the role rule
//     (requireManager); this rule only decides which jobs. One addition for interviews
//     (canViewInterview): the interviewer an interview is assigned to may see that interview
//     even when they are not on the job's team, since any user can be picked to interview.
//
// Who is in a job's team chat (canAccessJob, canAccessCandidate):
//   - members of that job's hiring team, whatever their role, and super admins.
//   With the rule above these are now the same jobs; the chat rule is kept separate so the two
//   can differ again without touching the sockets.

// Narrows an untrusted client-supplied id to a usable row id.
export function parseRoomId(value: unknown): number | null {
  const id = typeof value === "string" ? Number(value) : value;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function canAccessJob(
  user: AuthenticatedUser,
  jobId: number,
): Promise<boolean> {
  // Admins manage hiring teams, so requiring membership would lock them out.
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

// A candidate belongs to one job, so access follows that job.
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

/**
 * The user id to limit lists to the jobs whose hiring team they are on, or undefined for a super
 * admin, who sees every job. The list form of canViewJob.
 */
export function teamScope(user: AuthenticatedUser): number | undefined {
  return user.role === "super_admin" ? undefined : user.id;
}

/** canViewJob for several jobs at once: true only when the user may see every one. */
export async function canViewJobs(user: AuthenticatedUser, jobIds: number[]): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const ids = [...new Set(jobIds)];
  if (ids.length === 0) return true;
  const rows = await db
    .select({ jobId: jobHiringTeam.jobId })
    .from(jobHiringTeam)
    .where(and(eq(jobHiringTeam.userId, user.id), inArray(jobHiringTeam.jobId, ids)));
  return new Set(rows.map((r) => r.jobId)).size === ids.length;
}

/**
 * canViewCandidate for several candidates at once: true only when the user may see every one.
 * Ids that no longer exist are left out, so a list that is a moment out of date still works.
 */
export async function canViewCandidates(user: AuthenticatedUser, candidateIds: number[]): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const ids = [...new Set(candidateIds)];
  if (ids.length === 0) return true;
  const rows = await db.select({ jobId: candidates.jobId }).from(candidates).where(inArray(candidates.id, ids));
  return canViewJobs(user, rows.map((r) => r.jobId));
}

/** Whether the user may see this job and its candidates. Not the chat rule; see the top of the file. */
export async function canViewJob(
  user: AuthenticatedUser,
  jobId: number,
): Promise<boolean> {
  if (user.role === "super_admin") return true;
  return canAccessJob(user, jobId);
}

/**
 * Whether the user may see this candidate. For a super admin it is true even when there is no
 * such candidate: the handler answers 404 for that, where anyone else gets 403 either way so
 * they cannot probe for ids.
 */
export async function canViewCandidate(
  user: AuthenticatedUser,
  candidateId: number,
): Promise<boolean> {
  if (user.role === "super_admin") return true;
  return canAccessCandidate(user, candidateId);
}

/** Whether the user may see and act on this offer: the same rule as its job. */
export async function canViewOffer(user: AuthenticatedUser, offerId: number): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const [offer] = await db.select({ jobId: offers.jobId }).from(offers).where(eq(offers.id, offerId)).limit(1);
  if (!offer) return false;
  return canViewJob(user, offer.jobId);
}

/** canViewOffer for several offers at once. Ids that no longer exist are left out. */
export async function canViewOffers(user: AuthenticatedUser, offerIds: number[]): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const ids = [...new Set(offerIds)];
  if (ids.length === 0) return true;
  const rows = await db.select({ jobId: offers.jobId }).from(offers).where(inArray(offers.id, ids));
  return canViewJobs(user, rows.map((r) => r.jobId));
}

/** Whether the user may see this interview and the scorecards on it. */
export async function canViewInterview(
  user: AuthenticatedUser,
  interviewId: number,
): Promise<boolean> {
  if (user.role === "super_admin") return true;

  const [interview] = await db
    .select({ jobId: candidateInterviews.jobId, interviewerId: candidateInterviews.interviewerId })
    .from(candidateInterviews)
    .where(eq(candidateInterviews.id, interviewId))
    .limit(1);

  if (!interview) return false;
  if (interview.interviewerId === user.id) return true;
  return canAccessJob(user, interview.jobId);
}
