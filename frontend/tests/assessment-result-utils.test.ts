import { describe, it, expect } from "vitest";
import {
  formatDuration,
  getQuestionState,
  summarizeQuestions,
  type GradableQuestion,
} from "@/app/(dashboard)/candidates/[id]/lib/assessment-result-utils";

const choice = (selected: number[], correct: number[]): GradableQuestion => ({
  questionType: "multiple_choice",
  points: 1,
  options: [1, 2, 3].map((id) => ({ id, isCorrect: correct.includes(id) })),
  answer: selected.length
    ? { answerText: null, selectedOptionIds: selected }
    : null,
});

const written = (text: string | null): GradableQuestion => ({
  questionType: "short_answer",
  points: 1,
  options: [],
  answer: text === null ? null : { answerText: text, selectedOptionIds: [] },
});

describe("getQuestionState", () => {
  it("marks an exact match as correct", () => {
    expect(getQuestionState(choice([2], [2]))).toBe("correct");
  });

  it("marks a wrong pick as incorrect", () => {
    expect(getQuestionState(choice([1], [2]))).toBe("incorrect");
  });

  it("is incorrect when only some of several correct options were chosen", () => {
    expect(getQuestionState(choice([1], [1, 2]))).toBe("incorrect");
  });

  it("is incorrect when an extra option was chosen as well", () => {
    expect(getQuestionState(choice([1, 2], [1]))).toBe("incorrect");
  });

  it("is unanswered when nothing was selected", () => {
    expect(getQuestionState(choice([], [2]))).toBe("unanswered");
  });

  it("never calls a written answer incorrect, because the backend does not grade them", () => {
    expect(getQuestionState(written("Some answer"))).toBe("review");
  });

  it("treats a blank written answer as unanswered", () => {
    expect(getQuestionState(written("   "))).toBe("unanswered");
    expect(getQuestionState(written(null))).toBe("unanswered");
  });
});

describe("summarizeQuestions", () => {
  it("counts each state", () => {
    const summary = summarizeQuestions([
      choice([2], [2]),
      choice([1], [2]),
      choice([], [2]),
      written("x"),
    ]);
    expect(summary).toEqual({
      total: 4,
      correct: 1,
      incorrect: 1,
      review: 1,
      unanswered: 1,
    });
  });
});

describe("formatDuration", () => {
  it("formats short, minute and hour durations", () => {
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:00:19Z")).toBe("Under 1 minute");
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T10:42:00Z")).toBe("42 minutes");
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T11:05:00Z")).toBe("1 hour 5 minutes");
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T12:00:00Z")).toBe("2 hours");
  });

  it("returns null when a time is missing or the order is wrong", () => {
    expect(formatDuration(null, "2026-01-01T10:00:00Z")).toBeNull();
    expect(formatDuration("2026-01-01T10:00:00Z", "2026-01-01T09:00:00Z")).toBeNull();
  });
});
