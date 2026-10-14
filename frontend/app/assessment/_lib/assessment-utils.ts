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

const TEXT_TYPES = new Set(["short_answer", "long_answer"]);

export const isTextQuestion = (question: Question) => TEXT_TYPES.has(question.questionType);
export const isMultiSelect = (question: Question) => question.questionType === "checkbox";

/** Convert saved answers for the screens */
export function restoreAnswers(
  questions: Question[],
  saved: { questionId: number; answerText: string | null; optionIds: number[] }[] | undefined,
): Record<number, Answer> {
  const answers: Record<number, Answer> = {};
  for (const row of saved ?? []) {
    const question = questions.find((q) => q.id === row.questionId);
    if (!question) continue;
    answers[row.questionId] = isTextQuestion(question)
      ? { answerText: row.answerText ?? "" }
      : { optionIds: row.optionIds };
  }
  return answers;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
