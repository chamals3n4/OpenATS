import { describe, it, expect } from "vitest";
import {
  describeAssessment,
  isAlreadyAttached,
  sortByStageOrder,
} from "@/app/(dashboard)/jobs/[id]/lib/assessment-attach-utils";

describe("describeAssessment", () => {
  it("joins the time limit and question count", () => {
    expect(describeAssessment({ timeLimit: 30, questionCount: 5 })).toBe("30 min · 5 questions");
  });
  it("uses the singular and skips what is missing", () => {
    expect(describeAssessment({ timeLimit: 0, questionCount: 1 })).toBe("1 question");
    expect(describeAssessment({ timeLimit: 20 })).toBe("20 min");
    expect(describeAssessment(undefined)).toBe("");
  });
});

describe("isAlreadyAttached", () => {
  const attached = [{ assessmentId: 1, triggerStageId: 10 }];
  it("only matches the same assessment on the same stage", () => {
    expect(isAlreadyAttached(attached, 1, 10)).toBe(true);
    expect(isAlreadyAttached(attached, 1, 11)).toBe(false);
    expect(isAlreadyAttached(attached, 2, 10)).toBe(false);
  });
});

describe("sortByStageOrder", () => {
  const stages = [
    { id: 1, position: 1 },
    { id: 2, position: 2 },
    { id: 3, position: 3 },
  ];
  it("follows the pipeline and puts unknown or missing stages last", () => {
    const list = [
      { id: "a", triggerStageId: 3 },
      { id: "b", triggerStageId: null },
      { id: "c", triggerStageId: 1 },
      { id: "d", triggerStageId: 99 },
    ];
    expect(sortByStageOrder(list, stages).map((x) => x.id)).toEqual(["c", "a", "d", "b"]);
  });
});
