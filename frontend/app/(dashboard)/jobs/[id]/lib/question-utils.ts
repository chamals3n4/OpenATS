import type { CustomQuestion } from "@/types";

export type QuestionType = CustomQuestion["questionType"];

export const QUESTION_TYPES: { value: QuestionType; label: string; hint: string }[] = [
  { value: "short_answer", label: "Short answer", hint: "A single line of text" },
  { value: "long_answer", label: "Long answer", hint: "A paragraph of text" },
  { value: "url", label: "Link (URL)", hint: "A web address, such as a portfolio or GitHub profile" },
  { value: "radio", label: "Single choice", hint: "Pick one option" },
  { value: "checkbox", label: "Multiple choice", hint: "Pick any number of options" },
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPES.map((t) => [t.value, t.label]),
) as Record<QuestionType, string>;

/** The two types whose answers are picked from a list, so they need options. */
export function isChoiceType(type: QuestionType) {
  return type === "radio" || type === "checkbox";
}

export const TITLE_MAX = 500;
export const OPTION_MAX = 500;
export const MIN_OPTIONS = 2;

export interface QuestionDraft {
  title: string;
  type: QuestionType;
  /** The labels typed so far, blanks included. */
  options: string[];
}

export interface QuestionErrors {
  title?: string;
  options?: string;
  /** Problems with one specific option, keyed by its index. */
  optionErrors: Record<number, string>;
}

export function validateQuestion({ title, type, options }: QuestionDraft): QuestionErrors {
  const errors: QuestionErrors = { optionErrors: {} };

  if (!title.trim()) errors.title = "Write the question.";
  else if (title.trim().length > TITLE_MAX) {
    errors.title = `Keep the question under ${TITLE_MAX} characters.`;
  }

  if (isChoiceType(type)) {
    const seen = new Set<string>();
    let usable = 0;
    options.forEach((label, i) => {
      const value = label.trim();
      if (!value) return;
      if (value.length > OPTION_MAX) {
        errors.optionErrors[i] = `Keep this under ${OPTION_MAX} characters.`;
      } else if (seen.has(value.toLowerCase())) {
        errors.optionErrors[i] = "This option is listed twice.";
      } else {
        seen.add(value.toLowerCase());
        usable += 1;
      }
    });
    if (usable < MIN_OPTIONS) {
      errors.options = `Add at least ${MIN_OPTIONS} options for people to choose from.`;
    }
  }

  return errors;
}

export function hasQuestionErrors(errors: QuestionErrors) {
  return Boolean(errors.title || errors.options || Object.keys(errors.optionErrors).length > 0);
}

/** The options as the API wants them: blanks dropped, numbered from 1 in the order shown. */
export function toApiOptions(labels: string[]) {
  return labels
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label, i) => ({ label, isCorrect: false, position: i + 1 }));
}

/** Options to start an edit from: the saved ones in order, padded to the minimum. */
export function optionLabelsOf(question: Pick<CustomQuestion, "options">): string[] {
  const labels = [...question.options]
    .sort((a, b) => a.position - b.position)
    .map((o) => o.label);
  while (labels.length < MIN_OPTIONS) labels.push("");
  return labels;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  if (moved === undefined) return list;
  copy.splice(to, 0, moved);
  return copy;
}

/** Only the questions whose number changed need saving after a reorder. */
export function positionChanges(list: Pick<CustomQuestion, "id" | "position">[]) {
  return list
    .map((q, i) => ({ id: q.id, position: i + 1, was: q.position }))
    .filter((c) => c.position !== c.was)
    .map(({ id, position }) => ({ id, position }));
}
