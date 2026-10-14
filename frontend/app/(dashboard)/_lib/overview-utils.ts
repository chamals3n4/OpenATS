import type { AnalyticsReport } from "@/types";

export type Period = "7d" | "30d" | "90d";
export type Tone = "good" | "bad" | "neutral";

export const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

export const periodOf = (value: Period) => PERIODS.find((p) => p.value === value) ?? PERIODS[0];

export interface Delta {
  text: string;
  tone: Tone;
}

export interface Kpi {
  key: "applications" | "positions" | "timeToHire" | "offerRate";
  label: string;
  /** The figure, or "—" when there is no data to show. */
  value: string;
  unit?: string;
  /** Change against the previous period, left out when there is nothing to compare with. */
  delta: Delta | null;
  /** One line under the figure saying what it counts. */
  hint: string;
  managerOnly: boolean;
}

/** 12.5 -> "12.5", 12 -> "12": a trailing ".0" adds nothing. */
const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "+12.5%" or "-4%", green when up. A flat result reads "No change" in neutral. */
export function percentDelta(pct: number | null): Delta | null {
  if (pct === null) return null;
  if (pct === 0) return { text: "No change", tone: "neutral" };
  return { text: `${pct > 0 ? "+" : "-"}${trim(Math.abs(pct))}%`, tone: pct > 0 ? "good" : "bad" };
}

/** Percentage points, for a rate that is itself a percentage. */
export function pointsDelta(points: number | null): Delta | null {
  if (points === null) return null;
  if (points === 0) return { text: "No change", tone: "neutral" };
  return {
    text: `${points > 0 ? "+" : "-"}${trim(Math.abs(points))} pts`,
    tone: points > 0 ? "good" : "bad",
  };
}

/** Time to hire: fewer days is better, so faster is the good direction. */
export function fasterDelta(days: number | null): Delta | null {
  if (days === null) return null;
  if (days === 0) return { text: "No change", tone: "neutral" };
  const n = trim(Math.abs(days));
  const unit = Math.abs(days) === 1 ? "day" : "days";
  return days > 0 ? { text: `${n} ${unit} faster`, tone: "good" } : { text: `${n} ${unit} slower`, tone: "bad" };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildKpis(summary: AnalyticsReport["summary"]): Kpi[] {
  const s = summary;
  return [
    {
      key: "applications",
      label: "New applications",
      value: String(s.newCandidates),
      delta: percentDelta(s.totalCandidatesDeltaPct),
      hint: `${plural(s.totalCandidates, "candidate", "candidates")} in total`,
      managerOnly: false,
    },
    {
      key: "positions",
      label: "Open positions",
      value: String(s.openPositions),
      delta: null,
      hint: "Jobs that are open right now",
      managerOnly: false,
    },
    {
      key: "timeToHire",
      label: "Time to hire",
      value: s.avgTimeToHireDays === null ? "—" : trim(s.avgTimeToHireDays),
      unit: s.avgTimeToHireDays === null ? undefined : s.avgTimeToHireDays === 1 ? "day" : "days",
      delta: fasterDelta(s.avgTimeToHireDeltaDays),
      hint:
        s.avgTimeToHireDays === null
          ? "No offer was accepted in this period"
          : "From applying to an accepted offer",
      managerOnly: false,
    },
    {
      key: "offerRate",
      label: "Offer acceptance",
      value: s.offerAcceptanceRate === null ? "—" : `${trim(s.offerAcceptanceRate)}%`,
      delta: pointsDelta(s.offerAcceptanceRateDeltaPct),
      hint:
        s.offersSent === 0
          ? "No offer was sent in this period"
          : `${plural(s.offersSent, "offer", "offers")} sent in this period`,
      managerOnly: true,
    },
  ];
}

/** "today", "1 day", "23 days", for how long something has been waiting. */
export function ageLabel(days: number): string {
  if (days <= 0) return "today";
  return plural(days, "day", "days");
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today, 2:30 PM", "Tomorrow, 9:00 AM", or "Wed 17 Jun, 2:30 PM", in the viewer's time zone. */
export function interviewWhen(iso: string, now: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(today.getDate() + 1);
  if (sameDay(date, today)) return `Today, ${time}`;
  if (sameDay(date, tomorrow)) return `Tomorrow, ${time}`;
  const day = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}

/** Whole days between an ISO date and now. */
export function daysAgo(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}
