export type QuestionType = "Multiple Choice" | "Short Answer" | "True/False";

export interface AnswerOption {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  uid: number;
  title: string;
  description: string;
  type: QuestionType;
  options: AnswerOption[];
}
