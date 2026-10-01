import type { AiSummary, CandidateCvAnalysisPayload } from "@/types";

export type Verdict = AiSummary["verdict"];
export type Tone = "good" | "fair" | "poor";

export const VERDICT_LABELS: Record<Verdict, string> = {
  strong_fit: "Strong fit",
  moderate_fit: "Moderate fit",
  weak_fit: "Weak fit",
  not_recommended: "Not recommended",
};

/** The score arrives as a string for a Postgres numeric ("86.00"), or null; make it a 0 to 100 integer. */
export function normalizeScore(raw: number | string | null | undefined): number {
  const n = Number(raw);
  if (raw === null || raw === undefined || !Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function verdictFromScore(score: number): Verdict {
  if (score >= 75) return "strong_fit";
  if (score >= 50) return "moderate_fit";
  if (score >= 30) return "weak_fit";
  return "not_recommended";
}

/** The analysis's own verdict wins; the score only fills in when there is none. */
export function resolveVerdict(score: number, aiVerdict?: Verdict | null): Verdict {
  return aiVerdict ?? verdictFromScore(score);
}

export function toneForVerdict(verdict: Verdict): Tone {
  if (verdict === "strong_fit") return "good";
  if (verdict === "moderate_fit") return "fair";
  return "poor";
}

const BREAKDOWN_PARTS = [
  { key: "skills", label: "Skills vs job requirements", max: 55 },
  { key: "experience", label: "Experience fit", max: 25 },
  { key: "level", label: "Seniority level", max: 15 },
  { key: "certs", label: "Certifications", max: 5 },
] as const;

export interface BreakdownRow {
  key: (typeof BREAKDOWN_PARTS)[number]["key"];
  label: string;
  points: number;
  max: number;
  percent: number;
}

export function breakdownRows(
  breakdown: NonNullable<CandidateCvAnalysisPayload["scoreBreakdown"]>,
): BreakdownRow[] {
  return BREAKDOWN_PARTS.map(({ key, label, max }) => {
    const points = Number(breakdown[key]) || 0;
    return { key, label, points, max, percent: Math.min(100, Math.max(0, (points / max) * 100)) };
  });
}
