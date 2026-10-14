export function fmtTime(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "9:30 AM – 10:15 AM" when the length is known, otherwise just the start. */
export function fmtTimeRange(scheduledAt: string | null, durationMinutes: number | null) {
  if (!scheduledAt) return "";
  const start = fmtTime(scheduledAt);
  if (!durationMinutes) return start;
  const end = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60_000);
  return `${start} – ${fmtTime(end.toISOString())}`;
}

/** Whether an interview matches what was typed, by candidate, interview name, job or stage. */
export function matchesInterview(
  iv: { candidateName: string; eventName: string | null; jobTitle: string | null; stageName: string | null },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [iv.candidateName, iv.eventName, iv.jobTitle, iv.stageName].some((text) => text?.toLowerCase().includes(q));
}

export function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateLong(s: string) {
  return new Date(s).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
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
