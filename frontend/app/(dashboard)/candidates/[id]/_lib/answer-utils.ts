import type { CandidateDetail } from "@/types";

type RawAnswer = CandidateDetail["answers"][number];
type RawSelection = CandidateDetail["selections"][number];

export interface AnswerOption {
  id: number;
  label: string;
}

/** One application question with everything the candidate answered to it. */
export interface AnswerItem {
  questionId: number;
  title: string;
  position: number | null;
  text: string | null;
  options: AnswerOption[];
}

const titleOf = (title: string | null | undefined, questionId: number) =>
  title?.trim() || `Question #${questionId}`;

/**
 * Written answers and chosen options arrive as two separate lists. Merge them into one
 * entry per question, in the order of the application form (falling back to question id
 * for older API responses that carry no position).
 */
export function groupAnswers(
  answers: RawAnswer[],
  selections: RawSelection[],
): AnswerItem[] {
  const byQuestion = new Map<number, AnswerItem>();

  const entry = (
    questionId: number,
    title: string | null | undefined,
    position: number | null | undefined,
  ) => {
    let item = byQuestion.get(questionId);
    if (!item) {
      item = {
        questionId,
        title: titleOf(title, questionId),
        position: position ?? null,
        text: null,
        options: [],
      };
      byQuestion.set(questionId, item);
    }
    return item;
  };

  for (const a of answers) {
    const item = entry(a.questionId, a.questionTitle, a.questionPosition);
    const text = a.answerText?.trim();
    if (text) item.text = a.answerText;
  }
  for (const s of selections) {
    const item = entry(s.questionId, s.questionTitle, s.questionPosition);
    item.options.push({
      id: s.optionId,
      label: s.optionLabel?.trim() || `Option #${s.optionId}`,
    });
  }

  return [...byQuestion.values()].sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
      a.questionId - b.questionId,
  );
}

export function isAnswered(item: AnswerItem) {
  return Boolean(item.text) || item.options.length > 0;
}

/**
 * The address to open when a written answer is just a web link, else null. Only http and
 * https count, so an answer such as `javascript:...` is never turned into a clickable link.
 * A bare `www.` address gets https added.
 */
export function asWebUrl(text: string | null | undefined): string | null {
  const value = text?.trim();
  if (!value || /\s/.test(value)) return null;
  const candidate = /^www\./i.test(value) ? `https://${value}` : value;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
