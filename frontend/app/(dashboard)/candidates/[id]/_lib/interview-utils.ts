import type { CandidateInterview } from "@/types";

export interface InterviewGroups {
  /** Awaiting a time, or confirmed for a time that has not happened yet. Soonest first. */
  upcoming: CandidateInterview[];
  /** Finished, cancelled, or confirmed for a time that has passed. Latest first. */
  past: CandidateInterview[];
}

const time = (i: CandidateInterview) =>
  i.scheduledAt ? new Date(i.scheduledAt).getTime() : null;

export function isUpcoming(interview: CandidateInterview, now: number) {
  if (interview.status === "completed" || interview.status === "cancelled") return false;
  if (interview.status === "pending_schedule") return true;
  const at = time(interview);
  return at === null || at >= now;
}

export function groupInterviews(
  interviews: CandidateInterview[],
  now: number,
): InterviewGroups {
  const upcoming = interviews
    .filter((i) => isUpcoming(i, now))
    // Interviews still waiting for a time have none to sort by, so they come first.
    .sort((a, b) => (time(a) ?? -Infinity) - (time(b) ?? -Infinity) || a.id - b.id);

  const past = interviews
    .filter((i) => !isUpcoming(i, now))
    .sort((a, b) => (time(b) ?? b.id) - (time(a) ?? a.id));

  return { upcoming, past };
}

/** "Wed, Sep 9, 2026 · 12:30 PM" */
export function formatInterviewTime(iso: string) {
  const date = new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const clock = new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${clock}`;
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Today", "Tomorrow", "In 3 days", "Yesterday", "5 days ago", by calendar day. */
export function relativeDay(iso: string, now: number) {
  const days = Math.round((startOfDay(new Date(iso).getTime()) - startOfDay(now)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
}

export function eventTypeLabel(eventType: string | null) {
  if (eventType === "virtual") return "Virtual";
  if (eventType === "onsite") return "On site";
  return eventType ? eventType.charAt(0).toUpperCase() + eventType.slice(1) : "Virtual";
}

/** A short host name for a meeting link, such as "Google Meet" or "Zoom". */
export function meetingProvider(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("meet.google")) return "Google Meet";
    if (host.includes("zoom")) return "Zoom";
    if (host.includes("teams.microsoft") || host.includes("teams.live")) return "Microsoft Teams";
    return host;
  } catch {
    return "Meeting link";
  }
}

/** Only web links are opened, so a stored "javascript:" value can never become a link. */
export function safeMeetingUrl(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
