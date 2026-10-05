import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  computeInterviewScore,
  computeQuestionsScore,
  computeRatingScore,
  computeTotal,
  type PartScores,
} from "../../src/modules/scoring/scoring";

const none: PartScores = { questions: null, assessment: null, rating: null, interview: null };

describe("computeTotal", () => {
  it("weights all four parts", () => {
    const r = computeTotal({ questions: 100, assessment: 50, rating: 100, interview: 0 }, DEFAULT_WEIGHTS);
    // (30*100 + 30*50 + 10*100 + 30*0) / 100
    expect(r.total).toBe(55);
    expect(r.scoredParts).toBe(4);
  });

  it("ignores a part with no score and rescales the rest", () => {
    const r = computeTotal({ ...none, questions: 80, rating: 60 }, DEFAULT_WEIGHTS);
    // (30*80 + 10*60) / 40
    expect(r.total).toBe(75);
    expect(r.scoredParts).toBe(2);
    expect(r.weightedParts).toBe(4);
  });

  it("ignores a part the job gives no weight, even if it has a score", () => {
    const r = computeTotal(
      { questions: 100, assessment: 0, rating: null, interview: null },
      { ...DEFAULT_WEIGHTS, assessment: 0 },
    );
    expect(r.total).toBe(100);
    expect(r.weightedParts).toBe(3);
  });

  it("has no total until something is scored", () => {
    expect(computeTotal(none, DEFAULT_WEIGHTS).total).toBeNull();
  });
});

describe("computeQuestionsScore", () => {
  const radio = {
    id: 1,
    questionType: "radio",
    options: [
      { id: 10, points: 10, isKnockout: false },
      { id: 11, points: 5, isKnockout: false },
      { id: 12, points: 0, isKnockout: true },
    ],
  };
  const checkbox = {
    id: 2,
    questionType: "checkbox",
    options: [
      { id: 20, points: 4, isKnockout: false },
      { id: 21, points: 6, isKnockout: false },
    ],
  };

  it("scores against the most each question can earn", () => {
    const r = computeQuestionsScore([radio, checkbox], new Map([[1, [11]], [2, [20, 21]]]));
    // earned 5 + 10 of a possible 10 + 10
    expect(r).toEqual({ score: 75, knockedOut: false });
  });

  it("flags a knockout answer", () => {
    expect(computeQuestionsScore([radio], new Map([[1, [12]]]))).toEqual({ score: 0, knockedOut: true });
  });

  it("scores unanswered questions as zero", () => {
    expect(computeQuestionsScore([radio], new Map()).score).toBe(0);
  });

  it("is null when no option carries points", () => {
    const free = { id: 3, questionType: "radio", options: [{ id: 30, points: 0, isKnockout: false }] };
    expect(computeQuestionsScore([free], new Map([[3, [30]]])).score).toBeNull();
  });
});

describe("computeRatingScore", () => {
  it("maps the average of 1-5 stars to 0-100", () => {
    expect(computeRatingScore([5, 3])).toBe(80);
  });
  it("is null with no ratings", () => {
    expect(computeRatingScore([])).toBeNull();
  });
});

describe("computeInterviewScore", () => {
  it("averages scorecards, each the mean of its criteria", () => {
    expect(
      computeInterviewScore([
        { criterionRatings: [5, 3], overall: null }, // 4 -> 80
        { criterionRatings: [2, 2], overall: null }, // 2 -> 40
      ]),
    ).toBe(60);
  });

  it("falls back to the overall star rating, and skips empty scorecards", () => {
    expect(
      computeInterviewScore([
        { criterionRatings: [], overall: 5 },
        { criterionRatings: [], overall: null },
      ]),
    ).toBe(100);
  });
});
