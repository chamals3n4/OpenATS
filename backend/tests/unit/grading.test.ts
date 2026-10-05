import { describe, expect, it } from "vitest";
import {
  gradeChoiceQuestion,
  hasPassed,
  isWrittenType,
  scorePercentage,
} from "../../src/modules/assessment-execution/grading";

describe("gradeChoiceQuestion", () => {
  it("is all or nothing with a single correct option", () => {
    expect(gradeChoiceQuestion(4, [1], [1])).toBe(4);
    expect(gradeChoiceQuestion(4, [1], [2])).toBe(0);
    expect(gradeChoiceQuestion(4, [1], [1, 2])).toBe(0);
    expect(gradeChoiceQuestion(4, [1], [])).toBe(0);
  });

  it("gives partial credit for some of several correct options", () => {
    expect(gradeChoiceQuestion(6, [1, 2, 3], [1, 2, 3])).toBe(6);
    expect(gradeChoiceQuestion(6, [1, 2, 3], [1, 2])).toBe(4);
    expect(gradeChoiceQuestion(6, [1, 2, 3], [1])).toBe(2);
  });

  it("takes credit away for each wrong option, never below zero", () => {
    // 2 right, 1 wrong of 3 correct: (2 - 1) / 3
    expect(gradeChoiceQuestion(6, [1, 2, 3], [1, 2, 9])).toBe(2);
    expect(gradeChoiceQuestion(6, [1, 2, 3], [1, 8, 9])).toBe(0);
    expect(gradeChoiceQuestion(6, [1, 2, 3], [7, 8, 9])).toBe(0);
  });

  it("rounds to two decimals and scores a question with no correct option as zero", () => {
    expect(gradeChoiceQuestion(1, [1, 2, 3], [1])).toBe(0.33);
    expect(gradeChoiceQuestion(5, [], [1])).toBe(0);
  });
});

describe("assessment totals", () => {
  it("turns points into a percentage", () => {
    expect(scorePercentage(7, 10)).toBe(70);
    expect(scorePercentage(0, 0)).toBe(0);
  });

  it("passes at or above the pass mark", () => {
    expect(hasPassed(60, 60)).toBe(true);
    expect(hasPassed(59.99, 60)).toBe(false);
  });

  it("knows which questions a person grades", () => {
    expect(isWrittenType("short_answer")).toBe(true);
    expect(isWrittenType("long_answer")).toBe(true);
    expect(isWrittenType("radio")).toBe(false);
    expect(isWrittenType("checkbox")).toBe(false);
  });
});
