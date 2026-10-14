/** Question types: single, multiple, true_false, short, long */
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
  /** Set after saving so we update instead of adding */
  dbId?: number;
  title: string;
  description: string;
  type: QuestionType;
  /** Max points for a correct answer */
  points: number;
  options: AnswerOption[];
}
