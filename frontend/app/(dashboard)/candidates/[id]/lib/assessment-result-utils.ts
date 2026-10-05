import { formatElapsed } from "./format-elapsed";

export type QuestionState =
  | "correct"
  | "partial"
  | "incorrect"
  | "review"
  | "graded"
  | "unanswered";

/** The parts of a question in the attempt results that grading needs. */
export interface GradableQuestion {
  questionType: string;
  points: number;
  options: { id: number; isCorrect: boolean }[];
  answer: {
    answerText: string | null;
    selectedOptionIds: number[];
    /** Points a reviewer awarded to a written answer; empty until graded. */
    pointsEarned?: number | string | null;
  } | null;
}

/** Written answers are never auto-graded by the backend, so a person has to read them. */
export function isWrittenQuestion(questionType: string) {
  return questionType === "short_answer" || questionType === "long_answer";
}

/**
 * Mirrors the backend grader: each correct option picked earns an equal share, each wrong one
 * takes a share away, and the result never goes below zero. Returns the fraction 0-1.
 */
export function choiceFraction(q: GradableQuestion): number {
  const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
  if (correct.length === 0) return 0;
  const selected = new Set(q.answer?.selectedOptionIds ?? []);
  let right = 0;
  let wrong = 0;
  for (const id of selected) {
    if (correct.includes(id)) right += 1;
    else wrong += 1;
  }
  return Math.max(0, (right - wrong) / correct.length);
}

const hasGrade = (q: GradableQuestion) =>
  q.answer?.pointsEarned !== null && q.answer?.pointsEarned !== undefined;

/**
 * Where a question stands. A written answer is "review" until a reviewer grades it, then
 * "graded"; it is never "incorrect". A choice answer is correct, partly correct or incorrect.
 */
export function getQuestionState(q: GradableQuestion): QuestionState {
  if (isWrittenQuestion(q.questionType)) {
    if (!q.answer?.answerText?.trim()) return "unanswered";
    return hasGrade(q) ? "graded" : "review";
  }

  if ((q.answer?.selectedOptionIds ?? []).length === 0) return "unanswered";
  const fraction = choiceFraction(q);
  if (fraction >= 1) return "correct";
  return fraction > 0 ? "partial" : "incorrect";
}

/** Points the question has earned so far; a written answer counts only once graded. */
export function earnedPoints(q: GradableQuestion): number {
  if (isWrittenQuestion(q.questionType)) return hasGrade(q) ? Number(q.answer?.pointsEarned) : 0;
  return Math.round(q.points * choiceFraction(q) * 100) / 100;
}

export interface QuestionSummary {
  total: number;
  correct: number;
  partial: number;
  graded: number;
  incorrect: number;
  review: number;
  unanswered: number;
}

export function summarizeQuestions(questions: GradableQuestion[]): QuestionSummary {
  const summary: QuestionSummary = {
    total: questions.length,
    correct: 0,
    partial: 0,
    graded: 0,
    incorrect: 0,
    review: 0,
    unanswered: 0,
  };
  for (const q of questions) summary[getQuestionState(q)] += 1;
  return summary;
}

/** How long an attempt took, in plain words; null when either time is missing. */
export function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms < 60000 ? "Under 1 minute" : formatElapsed(ms);
}
