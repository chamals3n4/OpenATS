import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  SCORING_TEMPLATES,
  clampWeight,
  formatScore,
  hasAnyWeight,
  sharesOf,
  templateOf,
  validateCriteria,
  weightsOfJob,
} from "@/app/(dashboard)/jobs/[id]/lib/scoring-utils";

describe("sharesOf", () => {
  it("is each weight as a percentage of the total, adding up to 100", () => {
    expect(sharesOf({ questions: 30, assessment: 30, rating: 10, interview: 30 })).toEqual({
      questions: 30,
      assessment: 30,
      rating: 10,
      interview: 30,
    });
    const odd = sharesOf({ questions: 1, assessment: 1, rating: 1, interview: 0 });
    expect(Object.values(odd).reduce((a, b) => a + b, 0)).toBe(100);
    expect(odd.interview).toBe(0);
  });

  it("is all zero when nothing is weighted", () => {
    expect(sharesOf({ questions: 0, assessment: 0, rating: 0, interview: 0 })).toEqual({
      questions: 0,
      assessment: 0,
      rating: 0,
      interview: 0,
    });
  });

  it("every preset adds up to 100 shares", () => {
    for (const t of SCORING_TEMPLATES) {
      expect(Object.values(sharesOf(t.weights)).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
});

describe("weights", () => {
  it("reads a job's weights, falling back to the defaults", () => {
    expect(weightsOfJob(undefined)).toEqual(DEFAULT_WEIGHTS);
    expect(weightsOfJob({ scoreWeightInterview: 50 })).toEqual({ ...DEFAULT_WEIGHTS, interview: 50 });
  });

  it("clamps into 0-100 and rounds", () => {
    expect(clampWeight(-4)).toBe(0);
    expect(clampWeight(140)).toBe(100);
    expect(clampWeight(12.6)).toBe(13);
    expect(clampWeight(NaN)).toBe(0);
  });

  it("knows when no part is weighted and which preset matches", () => {
    expect(hasAnyWeight({ questions: 0, assessment: 0, rating: 0, interview: 0 })).toBe(false);
    expect(templateOf(DEFAULT_WEIGHTS)).toBe("balanced");
    expect(templateOf({ questions: 1, assessment: 2, rating: 3, interview: 4 })).toBeNull();
  });
});

describe("validateCriteria", () => {
  it("flags blank and repeated names", () => {
    const r = validateCriteria([{ name: "Skill" }, { name: " " }, { name: "skill" }]);
    expect(r.byIndex).toEqual({ 1: "Give this criterion a name.", 2: "This criterion is listed twice." });
  });
});

describe("formatScore", () => {
  it("rounds, and shows a dash when there is no score", () => {
    expect(formatScore("72.46")).toBe("72");
    expect(formatScore(null)).toBe("—");
    expect(formatScore(undefined)).toBe("—");
  });
});
