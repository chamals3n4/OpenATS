/**
 * Pure scoring maths. A candidate's total is built from four parts, each 0-100:
 * Questions, Assessment, Rating and Interview. A part with no score yet, or whose weight is 0
 * for the job, is left out and the remaining weights are rescaled.
 */

export const SCORE_PARTS = ["questions", "assessment", "rating", "interview"] as const;
export type ScorePart = (typeof SCORE_PARTS)[number];

export type ScoreWeights = Record<ScorePart, number>;
export type PartScores = Record<ScorePart, number | null>;

export const DEFAULT_WEIGHTS: ScoreWeights = {
  questions: 30,
  assessment: 30,
  rating: 10,
  interview: 30,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotal(
  scores: PartScores,
  weights: ScoreWeights,
): { total: number | null; scoredParts: number; weightedParts: number } {
  let weighted = 0;
  let weightSum = 0;
  let scoredParts = 0;
  let weightedParts = 0;
  for (const part of SCORE_PARTS) {
    const w = weights[part];
    if (w <= 0) continue;
    weightedParts += 1;
    const s = scores[part];
    if (s === null) continue;
    scoredParts += 1;
    weighted += w * s;
    weightSum += w;
  }
  return {
    total: weightSum > 0 ? round2(weighted / weightSum) : null,
    scoredParts,
    weightedParts,
  };
}

export interface ScoredQuestion {
  id: number;
  questionType: string;
  options: { id: number; points: number; isKnockout: boolean }[];
}

/** The most a question can earn: the best single option, or every positive option for checkboxes. */
function maxPoints(q: ScoredQuestion): number {
  const positive = q.options.map((o) => Math.max(o.points, 0));
  if (q.questionType === "checkbox") return positive.reduce((a, b) => a + b, 0);
  return positive.length > 0 ? Math.max(...positive) : 0;
}

/**
 * Questions score from the options a candidate picked. Questions with no points on any option
 * do not count. Returns null when no question carries points, so the part is ignored.
 */
export function computeQuestionsScore(
  questions: ScoredQuestion[],
  selected: Map<number, number[]>,
): { score: number | null; knockedOut: boolean } {
  let earned = 0;
  let possible = 0;
  let knockedOut = false;

  for (const q of questions) {
    const picked = new Set(selected.get(q.id) ?? []);
    const chosen = q.options.filter((o) => picked.has(o.id));
    if (chosen.some((o) => o.isKnockout)) knockedOut = true;

    const max = maxPoints(q);
    if (max <= 0) continue;
    possible += max;
    const got = chosen.reduce((sum, o) => sum + Math.max(o.points, 0), 0);
    earned += Math.min(got, max);
  }

  return { score: possible > 0 ? round2((earned / possible) * 100) : null, knockedOut };
}

const average = (values: number[]) =>
  values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** 1-5 stars from the team, as 20-100. */
export function computeRatingScore(ratings: number[]): number | null {
  const avg = average(ratings);
  return avg === null ? null : round2(avg * 20);
}

/**
 * Average of the submitted scorecards. A scorecard is the mean of its criterion scores, or its
 * single overall star rating when the job has no criteria. Scorecards with neither are skipped.
 */
export function computeInterviewScore(
  scorecards: { criterionRatings: number[]; overall: number | null }[],
): number | null {
  const perCard: number[] = [];
  for (const card of scorecards) {
    const avg = average(card.criterionRatings) ?? card.overall;
    if (avg !== null) perCard.push(avg * 20);
  }
  const avg = average(perCard);
  return avg === null ? null : round2(avg);
}
