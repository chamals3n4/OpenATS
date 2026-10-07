import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  computeInterviewScore,
  computeQuestionsScore,
  computeRatingScore,
  computeTotal,
  interviewSpread,
  scorecardScores,
  withholdInterviewScores,
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

  it("counts only the best pick on a single-answer question, but sums a checkbox", () => {
    // More than one radio pick is rejected at apply time; if it ever got through it must not stack.
    expect(computeQuestionsScore([radio], new Map([[1, [10, 11]]])).score).toBe(100);
    expect(computeQuestionsScore([checkbox], new Map([[2, [20, 21]]])).score).toBe(100);
    expect(computeQuestionsScore([checkbox], new Map([[2, [20]]])).score).toBe(40);
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

describe("interviewSpread", () => {
  it("shows how far apart the interviewers were", () => {
    const cards = [
      { criterionRatings: [5, 5], overall: null }, // 100
      { criterionRatings: [2, 2], overall: null }, // 40
      { criterionRatings: [], overall: 3 }, // 60
    ];
    expect(scorecardScores(cards)).toEqual([100, 40, 60]);
    expect(interviewSpread(cards)).toEqual({ count: 3, min: 40, max: 100 });
  });

  it("is null before any scorecard", () => {
    expect(interviewSpread([])).toBeNull();
    expect(interviewSpread([{ criterionRatings: [], overall: null }])).toBeNull();
  });
});

describe("withholdInterviewScores", () => {
  it("hides the Interview part and the total, and takes the interview off the parts count", () => {
    const row = { id: 1, questionsScore: "90.00", interviewScore: "73.33", totalScore: "80.50", scoredParts: 4 };
    expect(withholdInterviewScores(row)).toEqual({
      id: 1,
      questionsScore: "90.00",
      interviewScore: null,
      totalScore: null,
      scoredParts: 3,
    });
  });

  it("leaves the parts count alone when there was no interview score", () => {
    expect(withholdInterviewScores({ interviewScore: null, totalScore: "90", scoredParts: 1 }).scoredParts).toBe(1);
  });
});
