import type { Question, Answer } from "./assessment-types";

export function isAnswered(
  question: Question,
  answers: Record<number, Answer>,
): boolean {
  const a = answers[question.id];
  if (!a) return false;
  if (a.optionIds) return a.optionIds.length > 0;
  return (a.answerText ?? "").trim().length > 0;
}

export function countAnswered(
  questions: Question[],
  answers: Record<number, Answer>,
): number {
  return questions.filter((q) => isAnswered(q, answers)).length;
}

export function buildAnswerPayload(questionId: number, answer: Answer) {
  const payload: {
    questionId: number;
    answerText?: string | null;
    optionIds?: number[];
  } = { questionId };

  if (answer.answerText !== undefined) {
    payload.answerText = answer.answerText || null;
  }
  if (answer.optionIds !== undefined) {
    payload.optionIds = answer.optionIds;
  }

  return payload;
}
