import { and, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { candidateInterviews } from "../../db/schema";
import { DEFAULT_INTERVIEW_MINUTES } from "./interview-confirm";
import { hasPgCode, PG_EXCLUSION_VIOLATION } from "../../utils/pg-errors";

/**
 * When an interviewer is busy. An interview takes up its whole length, so a 60 minute interview
 * at 10:00 also rules out 10:30, not only another one at exactly 10:00.
 *
 * The database has the final say: the `candidate_interviews_no_overlap` constraint refuses two
 * scheduled interviews for one interviewer whose times overlap, so two candidates choosing the
 * same slot at the same moment cannot both get it. The functions here are for showing slots as
 * taken and for answering before the database has to.
 */

export interface BusyRange {
  start: number;
  end: number;
}

const minutes = (count: number | null | undefined) => (count ?? DEFAULT_INTERVIEW_MINUTES) * 60_000;

/** Whether an interview starting at `start` for `durationMinutes` would run into a busy time. */
export function overlapsBusy(
  start: Date,
  durationMinutes: number | null | undefined,
  busy: BusyRange[],
): boolean {
  const from = start.getTime();
  const to = from + minutes(durationMinutes);
  // Ending exactly when the next one starts is not a clash.
  return busy.some((range) => from < range.end && range.start < to);
}

/**
 * The times already taken by other scheduled interviews: those of the same interviewer, and any
 * interview where one side has no interviewer set, since nobody can say they do not clash.
 */
export async function getBusyRanges(
  excludeInterviewId: number,
  interviewerId: number | null,
): Promise<BusyRange[]> {
  const rows = await db
    .select({
      scheduledAt: candidateInterviews.scheduledAt,
      durationMinutes: candidateInterviews.durationMinutes,
      interviewerId: candidateInterviews.interviewerId,
    })
    .from(candidateInterviews)
    .where(
      and(eq(candidateInterviews.status, "scheduled"), ne(candidateInterviews.id, excludeInterviewId)),
    );

  const busy: BusyRange[] = [];
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    if (interviewerId != null && row.interviewerId != null && row.interviewerId !== interviewerId) {
      continue;
    }
    const start = row.scheduledAt.getTime();
    busy.push({ start, end: start + minutes(row.durationMinutes) });
  }
  return busy;
}

/** The database refused a time because the interviewer already has an interview then. */
export const isInterviewClash = (err: unknown) => hasPgCode(err, PG_EXCLUSION_VIOLATION);
