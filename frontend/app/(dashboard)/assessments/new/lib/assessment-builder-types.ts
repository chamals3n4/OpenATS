/**
 * The kinds of question, by what the candidate does. The names say how many answers can be
 * picked, because "multiple choice" on its own is read both ways.
 *
 *   single      pick one option
 *   multiple    pick every option that applies
 *   true_false  pick True or False
 *   short       type a line
 *   long        type a paragraph or more
 */
export type QuestionType = "single" | "multiple" | "true_false" | "short" | "long";

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  /** What the candidate does, in a few words. */
  hint: string;
}

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  { type: "single", label: "Single choice", hint: "Pick one answer" },
  { type: "multiple", label: "Multiple choice", hint: "Pick all that apply" },
  { type: "true_false", label: "True or false", hint: "Pick True or False" },
  { type: "short", label: "Short answer", hint: "A line of text" },
  { type: "long", label: "Long answer", hint: "A paragraph or more" },
];

export const questionTypeLabel = (type: QuestionType) =>
  QUESTION_TYPES.find((info) => info.type === type)?.label ?? type;

export interface AnswerOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  uid: number;
  /** Set once the question is saved, so editing updates it instead of adding a copy. */
  dbId?: number;
  title: string;
  description: string;
  type: QuestionType;
  /** What a fully correct answer is worth. A reviewer awards written answers up to this. */
  points: number;
  options: AnswerOption[];
}
