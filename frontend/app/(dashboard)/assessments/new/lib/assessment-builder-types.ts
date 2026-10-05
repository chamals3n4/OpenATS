export type QuestionType =
  | "Multiple Choice"
  | "Multiple Select"
  | "True/False"
  | "Short Answer"
  | "Long Answer";

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
