import { formatElapsed } from "./format-elapsed";

export type QuestionState =
  | "correct"
  | "partial"
  | "incorrect"
  | "review"
  | "graded"
  | "unanswered";

export interface GradableQuestion {
  questionType: string;
  points: number;
  options: { id: number; isCorrect: boolean }[];
  answer: {
    answerText: string | null;
    selectedOptionIds: number[];
    /** Reviewer points, empty until graded */
    pointsEarned?: number | string | null;
  } | null;
}

/** Written answers need manual grading */
export function isWrittenQuestion(questionType: string) {
  return questionType === "short_answer" || questionType === "long_answer";
}

/** Same as the backend grader. Returns 0 to 1 */
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

/** Question status for the results view */
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

/** Points so far. Written answers count after grading */
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

/** Time taken, null if a time is missing */
export function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms < 60000 ? "Under 1 minute" : formatElapsed(ms);
}
