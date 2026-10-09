/** Score helpers shared by the job setup and the candidate pages. */

export type ScorePart = "questions" | "assessment" | "rating" | "interview";
export type Weights = Record<ScorePart, number>;

export const SCORE_PARTS: { id: ScorePart; label: string; hint: string }[] = [
  { id: "questions", label: "Questions", hint: "Points from the application questions" },
  { id: "assessment", label: "Assessment", hint: "The test result, once the candidate finishes it" },
  { id: "rating", label: "Rating", hint: "Stars the team gives after reading the CV" },
  { id: "interview", label: "Interview", hint: "Average of the interviewers' scorecards" },
];

/** Each part's share of the total, as whole percentages that add up to 100 (all 0 when no weight is set). */
export function sharesOf(weights: Weights): Weights {
  const total = SCORE_PARTS.reduce((sum, p) => sum + weights[p.id], 0);
  if (total <= 0) return { questions: 0, assessment: 0, rating: 0, interview: 0 };
  const raw = SCORE_PARTS.map((p) => ({ id: p.id, exact: (weights[p.id] / total) * 100 }));
  const shares = Object.fromEntries(raw.map((r) => [r.id, Math.floor(r.exact)])) as Weights;
  // Hand the rounding leftovers to the parts with the biggest remainders.
  let left = 100 - Object.values(shares).reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (left <= 0) break;
    if (weights[r.id] > 0) {
      shares[r.id] += 1;
      left -= 1;
    }
  }
  return shares;
}

/** The scorecard score a candidate or part shows: "72", or a dash when there is none. */
export function formatScore(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : "—";
}

export type ScoreTone = "none" | "high" | "mid" | "low";

/** A rough band for colouring a 0-100 score. The number is always shown too. */
export function scoreTone(value: string | number | null | undefined): ScoreTone {
  if (value === null || value === undefined) return "none";
  const n = Number(value);
  if (!Number.isFinite(n)) return "none";
  return n >= 70 ? "high" : n >= 40 ? "mid" : "low";
}

/** "2 of 4 parts scored", or null when the job's weighted parts are not known. */
export function describeParts(scored: number | undefined, weighted: number | undefined): string | null {
  if (scored === undefined || weighted === undefined || weighted <= 0) return null;
  return `${scored} of ${weighted} ${weighted === 1 ? "part" : "parts"} scored`;
}
