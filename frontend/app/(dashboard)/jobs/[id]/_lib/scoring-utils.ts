import type { Job } from "@/types";
import { SCORE_PARTS, type Weights } from "@/lib/scoring";

export { SCORE_PARTS, formatScore, sharesOf, type ScorePart, type Weights } from "@/lib/scoring";

export const DEFAULT_WEIGHTS: Weights = { questions: 30, assessment: 30, rating: 10, interview: 30 };

export const SCORING_TEMPLATES: { id: string; label: string; description: string; weights: Weights }[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "A bit of everything. The default.",
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: "skills",
    label: "Skills first",
    description: "Lean on the test and the application answers.",
    weights: { questions: 25, assessment: 45, rating: 5, interview: 25 },
  },
  {
    id: "interview",
    label: "Interview led",
    description: "The interviewers have the most say.",
    weights: { questions: 15, assessment: 15, rating: 10, interview: 60 },
  },
  {
    id: "screening",
    label: "Screening only",
    description: "No test or interview, just answers and ratings.",
    weights: { questions: 60, assessment: 0, rating: 40, interview: 0 },
  },
];

export function weightsOfJob(job: Partial<Job> | undefined): Weights {
  if (!job) return DEFAULT_WEIGHTS;
  return {
    questions: job.scoreWeightQuestions ?? DEFAULT_WEIGHTS.questions,
    assessment: job.scoreWeightAssessment ?? DEFAULT_WEIGHTS.assessment,
    rating: job.scoreWeightRating ?? DEFAULT_WEIGHTS.rating,
    interview: job.scoreWeightInterview ?? DEFAULT_WEIGHTS.interview,
  };
}

export const clampWeight = (value: number) =>
  Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

export const hasAnyWeight = (weights: Weights) => SCORE_PARTS.some((p) => weights[p.id] > 0);

export const sameWeights = (a: Weights, b: Weights) => SCORE_PARTS.every((p) => a[p.id] === b[p.id]);

/** The preset these weights match, if any. */
export const templateOf = (weights: Weights) =>
  SCORING_TEMPLATES.find((t) => sameWeights(t.weights, weights))?.id ?? null;

export const toWeightsPayload = (w: Weights) => ({
  scoreWeightQuestions: w.questions,
  scoreWeightAssessment: w.assessment,
  scoreWeightRating: w.rating,
  scoreWeightInterview: w.interview,
});

export const MAX_CRITERIA = 10;
export const CRITERION_MAX = 100;
export const SUGGESTED_CRITERIA = ["Technical skill", "Communication", "Problem solving"];

export interface CriterionDraft {
  /** Set for a saved criterion, so renaming it keeps the scores already given. */
  id?: number;
  name: string;
}

/** Names of problems with a list of criteria, by index, plus a list-level message. */
export function validateCriteria(list: CriterionDraft[]): { byIndex: Record<number, string>; list?: string } {
  const byIndex: Record<number, string> = {};
  const seen = new Set<string>();
  list.forEach((c, i) => {
    const name = c.name.trim();
    if (!name) byIndex[i] = "Give this criterion a name.";
    else if (name.length > CRITERION_MAX) byIndex[i] = `Keep it under ${CRITERION_MAX} characters.`;
    else if (seen.has(name.toLowerCase())) byIndex[i] = "This criterion is listed twice.";
    else seen.add(name.toLowerCase());
  });
  return { byIndex, ...(list.length > MAX_CRITERIA && { list: `At most ${MAX_CRITERIA} criteria.` }) };
}
