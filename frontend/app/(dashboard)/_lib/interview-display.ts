import type { AllocatedSlot } from "@/hooks/queries/use-interviews";
import { formatTime } from "@/lib/format";

/** e.g. "9:30 AM – 10:15 AM" */
export function fmtTimeRange(scheduledAt: string | null, durationMinutes: number | null) {
  if (!scheduledAt) return "";
  const start = formatTime(scheduledAt);
  if (!durationMinutes) return start;
  const end = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60_000);
  return `${start} – ${formatTime(end.toISOString())}`;
}

/** Search by candidate, interview, job or stage */
export function matchesInterview(
  iv: { candidateName: string; eventName: string | null; jobTitle: string | null; stageName: string | null },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [iv.candidateName, iv.eventName, iv.jobTitle, iv.stageName].some((text) => text?.toLowerCase().includes(q));
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  scheduled: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  pending_schedule: {
    label: "Awaiting Slot",
    dot: "bg-amber-400",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
  // The candidate did not pick a time before the link ran out
  expired: {
    label: "No time picked",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300",
  },
};

export const OUTCOME_CONFIG: Record<string, { label: string; badge: string }> =
  {
    pass: {
      label: "Passed",
      badge:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    fail: {
      label: "Failed",
      badge: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    },
  };

/**
 * Whether an interview starting at `slot` (a datetime-local value) for `durationMinutes` would run
 * into one of the busy times. Ending exactly when another starts is not a clash.
 */
export function overlapsBusy(slot: string, durationMinutes: number, busy: AllocatedSlot[]): boolean {
  if (!slot) return false;
  const from = new Date(slot).getTime();
  if (Number.isNaN(from)) return false;
  const to = from + durationMinutes * 60_000;
  return busy.some((range) => from < new Date(range.end).getTime() && new Date(range.start).getTime() < to);
}
