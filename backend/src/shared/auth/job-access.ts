import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { jobHiringTeam } from "../../db/schema/pipeline";
import { candidates } from "../../db/schema/candidates";
import { candidateInterviews } from "../../db/schema/interviews";
import type { AuthenticatedUser } from "./verify-token";

// Per-job authorization, shared by the sockets and the HTTP middleware. There are two rules.
//
// Who may see and work on a job's candidates (canViewJob, canViewCandidate):
//   - super admins and hiring managers: every job. Hiring managers run hiring for the whole
//     company, so they are not limited to the jobs they were added to.
//   - interviewers: only jobs where they are on the hiring team. One addition for interviews
//     (canViewInterview): the interviewer an interview is assigned to may see that interview
//     even when they are not on the job's team, since any user can be picked to interview.
//
// Who is in a job's team chat (canAccessJob, canAccessCandidate):
//   - members of that job's hiring team, whatever their role, and super admins.
//   A hiring manager who is not on the team can open the candidate but not the team's chat.

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

/** Whether the user may see this job and its candidates. Not the chat rule; see the top of the file. */
export async function canViewJob(
  user: AuthenticatedUser,
  jobId: number,
): Promise<boolean> {
  if (user.role !== "interviewer") return true;
  return canAccessJob(user, jobId);
}

/**
 * Whether the user may see this candidate. For a manager or admin it is true even when there is
 * no such candidate: the handler answers 404 for that, where an interviewer gets 403 either way
 * so they cannot probe for ids.
 */
export async function canViewCandidate(
  user: AuthenticatedUser,
  candidateId: number,
): Promise<boolean> {
  if (user.role !== "interviewer") return true;
  return canAccessCandidate(user, candidateId);
}

/** Whether the user may see this interview and the scorecards on it. */
export async function canViewInterview(
  user: AuthenticatedUser,
  interviewId: number,
): Promise<boolean> {
  if (user.role !== "interviewer") return true;

  const [interview] = await db
    .select({ jobId: candidateInterviews.jobId, interviewerId: candidateInterviews.interviewerId })
    .from(candidateInterviews)
    .where(eq(candidateInterviews.id, interviewId))
    .limit(1);

  if (!interview) return false;
  if (interview.interviewerId === user.id) return true;
  return canAccessJob(user, interview.jobId);
}
