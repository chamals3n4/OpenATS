import { describe, expect, it } from "vitest";
import {
  clampPoints,
  firstQuestionProblem,
  getDefaultOptionsForType,
  makeQuestion,
  questionFromApi,
  questionToApi,
  toggleCorrectOption,
} from "@/app/(dashboard)/assessments/new/lib/assessment-builder-utils";
import type { Question } from "@/app/(dashboard)/assessments/new/lib/assessment-builder-types";

const q = (over: Partial<Question> = {}): Question => ({
  ...makeQuestion(),
  title: "Pick",
  ...over,
});

describe("toggleCorrectOption", () => {
  it("keeps exactly one correct option on a single-answer question", () => {
    const question = q();
    const [a, b] = question.options;
    const first = toggleCorrectOption({ ...question, options: toggleCorrectOption(question, a!.id) }, b!.id);
    expect(first.filter((o) => o.isCorrect).map((o) => o.id)).toEqual([b!.id]);
  });

  it("lets a multiple select have several correct options", () => {
    let question = q({ type: "Multiple Select" });
    const [a, b] = question.options;
    question = { ...question, options: toggleCorrectOption(question, a!.id) };
    question = { ...question, options: toggleCorrectOption(question, b!.id) };
    expect(question.options.filter((o) => o.isCorrect)).toHaveLength(2);
    question = { ...question, options: toggleCorrectOption(question, a!.id) };
    expect(question.options.filter((o) => o.isCorrect)).toHaveLength(1);
  });
});

describe("changing the type", () => {
  it("keeps only the first correct answer when going from multiple select to multiple choice", () => {
    const options = q().options.map((o) => ({ ...o, isCorrect: true }));
    const next = getDefaultOptionsForType("Multiple Select", "Multiple Choice", options);
    expect(next.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(next[0]!.isCorrect).toBe(true);
  });
});

describe("questionToApi / questionFromApi", () => {
  it("sends the points and the type the candidate page understands", () => {
    expect(questionToApi(q({ type: "Multiple Select", points: 3 }), 0)).toMatchObject({
      questionType: "checkbox",
      points: 3,
      position: 1,
    });
    expect(questionToApi(q({ type: "Multiple Choice" }), 1).questionType).toBe("radio");
    const long = questionToApi(q({ type: "Long Answer", points: 5 }), 2);
    expect(long).toMatchObject({ questionType: "long_answer", points: 5 });
    expect(long.options).toBeUndefined();
  });

  it("reads points back from Postgres numeric strings", () => {
    expect(questionFromApi({ id: 1, questionType: "long_answer", points: "2.50" })).toMatchObject({
      type: "Long Answer",
      points: 2.5,
      dbId: 1,
    });
  });

  it("opens an older multiple_choice question with several correct answers as a multiple select", () => {
    const opts = [
      { id: 1, label: "A", isCorrect: true },
      { id: 2, label: "B", isCorrect: true },
      { id: 3, label: "C", isCorrect: false },
    ];
    expect(questionFromApi({ id: 1, questionType: "multiple_choice", options: opts }).type).toBe("Multiple Select");
    expect(questionFromApi({ id: 1, questionType: "multiple_choice", options: opts.slice(1) }).type).toBe("Multiple Choice");
  });
});

describe("clampPoints and validation", () => {
  it("keeps points in range, in half steps", () => {
    expect(clampPoints(0)).toBe(0.5);
    expect(clampPoints(2.3)).toBe(2.5);
    expect(clampPoints(5000)).toBe(1000);
    expect(clampPoints(NaN)).toBe(1);
  });

  it("asks for a correct answer on a choice question, but not a written one", () => {
    expect(firstQuestionProblem([q()])).toMatch(/Question 1/);
    expect(firstQuestionProblem([q({ type: "Long Answer", options: [] })])).toBeNull();
    const withCorrect = q();
    withCorrect.options[0]!.isCorrect = true;
    expect(firstQuestionProblem([withCorrect])).toBeNull();
  });
});
