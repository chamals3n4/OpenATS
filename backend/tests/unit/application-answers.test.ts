import { describe, it, expect } from "vitest";
import {
  findAnswerProblem,
  mustAnswer,
  type ApplicationQuestion,
} from "../../src/modules/candidate/application-answers";

const text = (id: number, isRequired = false): ApplicationQuestion => ({
  id,
  title: `Text ${id}`,
  questionType: "short_answer",
  isRequired,
  options: [],
});

const choice = (
  id: number,
  questionType: "radio" | "checkbox",
  optionIds: number[],
  extra: { isRequired?: boolean; knockout?: number } = {},
): ApplicationQuestion => ({
  id,
  title: `Choice ${id}`,
  questionType,
  isRequired: extra.isRequired ?? false,
  options: optionIds.map((optionId) => ({ id: optionId, isKnockout: optionId === extra.knockout })),
});

describe("mustAnswer", () => {
  it("is true for a required question", () => {
    expect(mustAnswer(text(1, true))).toBe(true);
  });

  it("is true for a question with a knockout option, even when it is not ticked as required", () => {
    expect(mustAnswer(choice(1, "radio", [10, 11], { knockout: 11 }))).toBe(true);
  });

  it("is false for an optional question with no knockout", () => {
    expect(mustAnswer(text(1))).toBe(false);
    expect(mustAnswer(choice(2, "radio", [10, 11]))).toBe(false);
  });
});

describe("findAnswerProblem", () => {
  it("passes a complete application", () => {
    const questions = [text(1, true), choice(2, "radio", [10, 11], { isRequired: true }), text(3)];
    const answers = [
      { questionId: 1, answerText: "Five years" },
      { questionId: 2, optionIds: [10] },
    ];
    expect(findAnswerProblem(questions, answers)).toBeNull();
  });

  it("passes when there are no questions and no answers", () => {
    expect(findAnswerProblem([], [])).toBeNull();
  });

  describe("questions that have to be answered", () => {
    it("refuses a required written question that is missing", () => {
      expect(findAnswerProblem([text(1, true)], [])).toBe('Please answer "Text 1"');
    });

    it("refuses a required written question answered with only spaces", () => {
      expect(findAnswerProblem([text(1, true)], [{ questionId: 1, answerText: "   " }])).toMatch(/Please answer/);
    });

    it("refuses a required choice question with nothing picked", () => {
      const question = choice(1, "checkbox", [10, 11], { isRequired: true });
      expect(findAnswerProblem([question], [{ questionId: 1, optionIds: [] }])).toMatch(/Please answer/);
    });

    it("refuses a skipped knockout question, so skipping is not a way round the knockout", () => {
      const question = choice(1, "radio", [10, 11], { knockout: 11 });
      expect(findAnswerProblem([question], [])).toMatch(/Please answer/);
    });

    it("lets an optional question be left out or sent blank", () => {
      expect(findAnswerProblem([text(1)], [])).toBeNull();
      expect(findAnswerProblem([text(1)], [{ questionId: 1, answerText: "" }])).toBeNull();
    });
  });

  describe("answers that do not fit", () => {
    it("refuses an answer to a question of another job", () => {
      expect(findAnswerProblem([text(1)], [{ questionId: 99, answerText: "x" }])).toMatch(/not part of this job/);
    });

    it("refuses an option that belongs to another question", () => {
      const questions = [choice(1, "radio", [10, 11], { knockout: 11 }), choice(2, "radio", [20, 21])];
      // Answering the knockout question with a harmless option taken from question 2.
      expect(findAnswerProblem(questions, [{ questionId: 1, optionIds: [20] }])).toMatch(/does not belong/);
    });

    it("refuses two picks on a single-choice question", () => {
      expect(findAnswerProblem([choice(1, "radio", [10, 11])], [{ questionId: 1, optionIds: [10, 11] }])).toMatch(/only one/);
    });

    it("allows several picks on a checkbox question", () => {
      expect(findAnswerProblem([choice(1, "checkbox", [10, 11])], [{ questionId: 1, optionIds: [10, 11] }])).toBeNull();
    });

    it("refuses the same option twice", () => {
      expect(findAnswerProblem([choice(1, "checkbox", [10, 11])], [{ questionId: 1, optionIds: [10, 10] }])).toMatch(/twice/);
    });

    it("refuses the same question answered twice", () => {
      const answers = [
        { questionId: 1, optionIds: [10] },
        { questionId: 1, optionIds: [11] },
      ];
      expect(findAnswerProblem([choice(1, "radio", [10, 11])], answers)).toMatch(/more than once/);
    });

    it("refuses text on a choice question and options on a written one", () => {
      expect(findAnswerProblem([choice(1, "radio", [10, 11])], [{ questionId: 1, answerText: "neither" }])).toMatch(/Choose from the options/);
      expect(findAnswerProblem([text(1)], [{ questionId: 1, optionIds: [10] }])).toMatch(/written answer/);
    });
  });
});
