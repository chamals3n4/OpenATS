import { describe, it, expect } from "vitest";
import {
  hasQuestionErrors,
  isChoiceType,
  moveItem,
  optionLabelsOf,
  positionChanges,
  toApiOptions,
  validateQuestion,
} from "@/app/(dashboard)/jobs/[id]/lib/question-utils";

describe("isChoiceType", () => {
  it("is true only for the types answered from a list", () => {
    expect(isChoiceType("radio")).toBe(true);
    expect(isChoiceType("checkbox")).toBe(true);
    expect(isChoiceType("short_answer")).toBe(false);
    expect(isChoiceType("long_answer")).toBe(false);
  });
});

describe("validateQuestion", () => {
  it("accepts a written question with just a title", () => {
    expect(hasQuestionErrors(validateQuestion({ title: "Github URL", type: "short_answer", options: [] }))).toBe(false);
  });

  it("asks for the question", () => {
    expect(validateQuestion({ title: "  ", type: "short_answer", options: [] }).title).toBeTruthy();
    expect(validateQuestion({ title: "x".repeat(501), type: "short_answer", options: [] }).title).toMatch(/under 500/);
  });

  it("needs at least two real options for a choice question, as the server requires", () => {
    expect(validateQuestion({ title: "Stack?", type: "radio", options: ["React", ""] }).options).toMatch(/at least 2/);
    expect(validateQuestion({ title: "Stack?", type: "checkbox", options: [] }).options).toMatch(/at least 2/);
    expect(hasQuestionErrors(validateQuestion({ title: "Stack?", type: "radio", options: ["React", "Vue"] }))).toBe(false);
  });

  it("ignores options on a written question", () => {
    expect(hasQuestionErrors(validateQuestion({ title: "Why us?", type: "long_answer", options: [""] }))).toBe(false);
  });

  it("flags a repeated option on its own row, without counting it twice", () => {
    const errors = validateQuestion({ title: "Stack?", type: "radio", options: ["React", "react", "Vue"] });
    expect(errors.optionErrors[1]).toBe("This option is listed twice.");
    expect(errors.options).toBeUndefined();
  });
});

describe("toApiOptions", () => {
  it("drops blanks, trims, and numbers from 1 in the order shown", () => {
    const o = (label: string, points = 0, isKnockout = false) => ({ label, points, isKnockout });
    expect(toApiOptions([o(" React "), o(""), o("Vue"), o("  ")])).toEqual([
      { label: "React", isCorrect: false, points: 0, isKnockout: false, position: 1 },
      { label: "Vue", isCorrect: false, points: 0, isKnockout: false, position: 2 },
    ]);
  });

  it("keeps the scoring and clamps points into range", () => {
    expect(
      toApiOptions([
        { label: "Yes", points: 10, isKnockout: false },
        { label: "No", points: -5, isKnockout: true },
        { label: "Maybe", points: 500, isKnockout: false },
      ]),
    ).toEqual([
      { label: "Yes", isCorrect: false, points: 10, isKnockout: false, position: 1 },
      { label: "No", isCorrect: false, points: 0, isKnockout: true, position: 2 },
      { label: "Maybe", isCorrect: false, points: 100, isKnockout: false, position: 3 },
    ]);
  });
});

describe("optionLabelsOf", () => {
  const opt = (label: string, position: number) => ({ id: position, questionId: 1, label, isCorrect: false, points: 0, isKnockout: false, position });

  it("lists saved options in order", () => {
    expect(optionLabelsOf({ options: [opt("B", 2), opt("A", 1), opt("C", 3)] })).toEqual(["A", "B", "C"]);
  });

  it("pads to the minimum so there are always two rows to fill in", () => {
    expect(optionLabelsOf({ options: [] })).toEqual(["", ""]);
    expect(optionLabelsOf({ options: [opt("A", 1)] })).toEqual(["A", ""]);
  });
});

describe("reordering", () => {
  it("moves an item without touching the original list", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("returns the list unchanged for an index that is not there", () => {
    expect(moveItem(["a"], 5, 0)).toEqual(["a"]);
  });

  it("lists only the questions whose number changed", () => {
    const q = (id: number, position: number) => ({ id, position });
    expect(positionChanges([q(1, 1), q(2, 2), q(3, 3)])).toEqual([]);
    expect(positionChanges([q(2, 2), q(1, 1), q(3, 3)])).toEqual([
      { id: 2, position: 1 },
      { id: 1, position: 2 },
    ]);
  });
});

import { asWebUrl } from "@/app/(dashboard)/candidates/[id]/lib/answer-utils";

describe("asWebUrl", () => {
  it("accepts http and https links and bare www addresses", () => {
    expect(asWebUrl("https://github.com/chamal")).toBe("https://github.com/chamal");
    expect(asWebUrl("  http://example.com/a?b=1 ")).toBe("http://example.com/a?b=1");
    expect(asWebUrl("www.example.com")).toBe("https://www.example.com/");
  });

  it("never turns other schemes or ordinary text into a link", () => {
    expect(asWebUrl("javascript:alert(1)")).toBeNull();
    expect(asWebUrl("mailto:a@b.com")).toBeNull();
    expect(asWebUrl("I have 5 years, see https://x.com")).toBeNull();
    expect(asWebUrl("React")).toBeNull();
    expect(asWebUrl("")).toBeNull();
    expect(asWebUrl(null)).toBeNull();
  });
});
