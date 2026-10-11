export type { QuestionType } from "@/types";
import type { QuestionType } from "@/types";

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
    /** How long the candidate has, in minutes. */
    timeLimit: number;
    questions: Question[];
  };
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  /** The company the assessment is from. Null when no company has been set up. */
  company?: { name: string } | null;
  /** The position the candidate applied for. */
  jobTitle?: string | null;
  /** Answers already saved for this attempt, so a reload carries on where it stopped. */
  savedAnswers?: { questionId: number; answerText: string | null; optionIds: number[] }[];
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
