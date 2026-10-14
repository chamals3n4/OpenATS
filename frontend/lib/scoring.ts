/** Score helpers */

export type ScorePart = "questions" | "assessment" | "rating" | "interview";
export type Weights = Record<ScorePart, number>;

export const SCORE_PARTS: { id: ScorePart; label: string; hint: string }[] = [
  { id: "questions", label: "Questions", hint: "Points from the application questions" },
  { id: "assessment", label: "Assessment", hint: "The test result, once the candidate finishes it" },
  { id: "rating", label: "Rating", hint: "Stars the team gives after reading the CV" },
  { id: "interview", label: "Interview", hint: "Average of the interviewers' scorecards" },
];

/** Each part's share in percent, adds up to 100 */
export function sharesOf(weights: Weights): Weights {
  const total = SCORE_PARTS.reduce((sum, p) => sum + weights[p.id], 0);
  if (total <= 0) return { questions: 0, assessment: 0, rating: 0, interview: 0 };
  const raw = SCORE_PARTS.map((p) => ({ id: p.id, exact: (weights[p.id] / total) * 100 }));
  const shares = Object.fromEntries(raw.map((r) => [r.id, Math.floor(r.exact)])) as Weights;
  // Give rounding leftovers to the biggest remainders
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

/** Score as text, or a dash */
export function formatScore(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n)) : "—";
}

export type ScoreTone = "none" | "high" | "mid" | "low";

/** Colour band for a score */
export function scoreTone(value: string | number | null | undefined): ScoreTone {
  if (value === null || value === undefined) return "none";
  const n = Number(value);
  if (!Number.isFinite(n)) return "none";
  return n >= 70 ? "high" : n >= 40 ? "mid" : "low";
}

/** e.g. "2 of 4 parts scored" */
export function describeParts(scored: number | undefined, weighted: number | undefined): string | null {
  if (scored === undefined || weighted === undefined || weighted <= 0) return null;
  return `${scored} of ${weighted} ${weighted === 1 ? "part" : "parts"} scored`;
}

export interface CandidateFlag {
  key: "knockout" | "failed_assessment" | "assessment_expired";
  label: string;
  /** Plain-English reason, and what it does and does not do. */
  explanation: string;
}

/** The flags a candidate has, with what each one means. */
export function candidateFlags(c: {
  knockedOut?: boolean | undefined;
  assessmentPassed?: boolean | null | undefined;
  assessmentExpired?: boolean | undefined;
}): CandidateFlag[] {
  const flags: CandidateFlag[] = [];
  if (c.knockedOut) {
    flags.push({
      key: "knockout",
      label: "Does not meet requirements",
      explanation:
        "They picked an answer marked as a knockout on the application form. This does not change their score.",
    });
  }
  if (c.assessmentPassed === false) {
    flags.push({
      key: "failed_assessment",
      label: "Failed assessment",
      explanation: "They scored below the pass mark on the test. They are not rejected automatically.",
    });
  }
  if (c.assessmentExpired) {
    flags.push({
      key: "assessment_expired",
      label: "Assessment expired",
      explanation: "The test link ran out unused, so the Assessment part counts as 0.",
    });
  }
  return flags;
}
