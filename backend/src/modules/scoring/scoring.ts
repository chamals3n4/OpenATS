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
    // Only a checkbox can earn from several options; any other type counts its best pick.
    const picks = chosen.map((o) => Math.max(o.points, 0));
    const got =
      q.questionType === "checkbox"
        ? picks.reduce((sum, p) => sum + p, 0)
        : picks.length > 0
          ? Math.max(...picks)
          : 0;
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

export interface Scorecard {
  criterionRatings: number[];
  overall: number | null;
}

/**
 * Each submitted scorecard as a 0-100 score. A scorecard is the mean of its criterion scores, or
 * its single overall star rating when the job has no criteria. Scorecards with neither are skipped.
 */
export function scorecardScores(scorecards: Scorecard[]): number[] {
  const perCard: number[] = [];
  for (const card of scorecards) {
    const avg = average(card.criterionRatings) ?? card.overall;
    if (avg !== null) perCard.push(round2(avg * 20));
  }
  return perCard;
}

/** The Interview part: the average of the submitted scorecards. */
export function computeInterviewScore(scorecards: Scorecard[]): number | null {
  const perCard = scorecardScores(scorecards);
  const avg = average(perCard);
  return avg === null ? null : round2(avg);
}

/** How far apart the interviewers were, so an average of 60 can be told from 5 and 100. */
export function interviewSpread(
  scorecards: Scorecard[],
): { count: number; min: number; max: number } | null {
  const perCard = scorecardScores(scorecards);
  if (perCard.length === 0) return null;
  return { count: perCard.length, min: Math.min(...perCard), max: Math.max(...perCard) };
}

/**
 * What an interviewer who has not yet submitted their own scorecard may see. The Interview part
 * and the total both include other interviewers' scorecards, so both are withheld.
 */
export function withholdInterviewScores<
  T extends { interviewScore?: unknown; totalScore?: unknown; scoredParts?: number },
>(row: T): T {
  const hadInterview = row.interviewScore !== null && row.interviewScore !== undefined;
  return {
    ...row,
    interviewScore: null,
    totalScore: null,
    ...(row.scoredParts !== undefined && {
      scoredParts: Math.max(0, row.scoredParts - (hadInterview ? 1 : 0)),
    }),
  };
}
