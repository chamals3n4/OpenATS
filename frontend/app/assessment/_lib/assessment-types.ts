export type QuestionType =
  | "short_answer"
  | "long_answer"
  | "checkbox"
  | "radio"
  | "multiple_choice";

export interface Option {
  id: number;
  label: string;
  position: number;
}

export interface Question {
  id: number;
  title: string;
  description: string | null;
  questionType: QuestionType;
  position: number;
  points: number;
  options: Option[];
}

export interface AttemptData {
  id: number;
  status: "pending" | "started" | "completed";
  expiresAt: string;
  startedAt: string | null;
  completedAt: string | null;
  assessment: {
    id: number;
    title: string;
    description: string | null;
    timeLimit: number;
    questions: Question[];
  };
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export type Answer = { answerText?: string; optionIds?: number[] };

export type Screen =
  | "loading"
  | "error"
  | "expired"
  | "already_completed"
  | "intro"
  | "quiz"
  | "submitted";

export interface ScoreResult {
  passed: boolean;
  scorePercentage: number;
}
