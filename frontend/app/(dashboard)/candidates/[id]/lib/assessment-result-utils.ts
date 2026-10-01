import { formatElapsed } from "./format-elapsed";

export type QuestionState = "correct" | "incorrect" | "review" | "unanswered";

/** The parts of a question in the attempt results that grading needs. */
export interface GradableQuestion {
  questionType: string;
  points: number;
  options: { id: number; isCorrect: boolean }[];
  answer: {
    answerText: string | null;
    selectedOptionIds: number[];
  } | null;
}

/** Written answers are never auto-graded by the backend, so a person has to read them. */
export function isWrittenQuestion(questionType: string) {
  return questionType === "short_answer" || questionType === "long_answer";
}

/**
 * Mirrors the backend grader: a choice question is correct only when the selected
 * options are exactly the correct options. Written answers are never scored
 * automatically, so an answered one is "review", not "incorrect".
 */
export function getQuestionState(q: GradableQuestion): QuestionState {
  if (isWrittenQuestion(q.questionType)) {
    return q.answer?.answerText?.trim() ? "review" : "unanswered";
  }

  const selected = q.answer?.selectedOptionIds ?? [];
  if (selected.length === 0) return "unanswered";

  const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
  const isExactMatch =
    correct.length === selected.length &&
    correct.every((id) => selected.includes(id));
  return isExactMatch ? "correct" : "incorrect";
}

export interface QuestionSummary {
  total: number;
  correct: number;
  incorrect: number;
  review: number;
  unanswered: number;
}

export function summarizeQuestions(questions: GradableQuestion[]): QuestionSummary {
  const summary: QuestionSummary = {
    total: questions.length,
    correct: 0,
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
