import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  computeInterviewScore,
  computeQuestionsScore,
  computeRatingScore,
  computeAssessmentResult,
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
  it("maps the average of 1-5 stars to 0-100, with one star worth nothing", () => {
    expect(computeRatingScore([5, 3])).toBe(75);
    expect(computeRatingScore([1])).toBe(0);
    expect(computeRatingScore([5])).toBe(100);
  });
  it("is null with no ratings", () => {
    expect(computeRatingScore([])).toBeNull();
  });
});

describe("computeInterviewScore", () => {
  it("averages scorecards, each the mean of its criteria", () => {
    expect(
      computeInterviewScore([
        { criterionRatings: [5, 3], overall: null }, // 4 -> 75
        { criterionRatings: [2, 2], overall: null }, // 2 -> 25
      ]),
    ).toBe(50);
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
      { criterionRatings: [2, 2], overall: null }, // 25
      { criterionRatings: [], overall: 3 }, // 50
    ];
    expect(scorecardScores(cards)).toEqual([100, 25, 50]);
    expect(interviewSpread(cards)).toEqual({ count: 3, min: 25, max: 100 });
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

describe("a checkbox question with negative points", () => {
  const tick = {
    id: 5,
    questionType: "checkbox",
    options: [
      { id: 50, points: 5, isKnockout: false },
      { id: 51, points: 5, isKnockout: false },
      { id: 52, points: -5, isKnockout: false }, // a wrong answer
    ],
  };

  it("does not hand out full marks for ticking everything", () => {
    expect(computeQuestionsScore([tick], new Map([[5, [50, 51, 52]]])).score).toBe(50);
    expect(computeQuestionsScore([tick], new Map([[5, [50, 51]]])).score).toBe(100);
  });

  it("never scores a question below zero", () => {
    expect(computeQuestionsScore([tick], new Map([[5, [52]]])).score).toBe(0);
  });

  it("ignores negative points on a single-answer question", () => {
    const radio = {
      id: 6,
      questionType: "radio",
      options: [
        { id: 60, points: 10, isKnockout: false },
        { id: 61, points: -10, isKnockout: false },
      ],
    };
    expect(computeQuestionsScore([radio], new Map([[6, [61]]])).score).toBe(0);
  });
});

describe("computeAssessmentResult", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  const past = new Date("2026-10-01T00:00:00Z");
  const future = new Date("2026-10-20T00:00:00Z");
  let seq = 0;
  const attempt = (over: Partial<Parameters<typeof computeAssessmentResult>[0][number]> = {}) => ({
    assessmentId: 1,
    status: "completed",
    expiresAt: future,
    createdAt: new Date(2026, 9, 2 + seq++),
    scorePercentage: 50 as number | null,
    passed: false as boolean | null,
    ...over,
  });

  it("counts a finished test by its score and result", () => {
    expect(computeAssessmentResult([attempt({ scorePercentage: 80, passed: true })], now)).toEqual({
      score: 80,
      passed: true,
      expired: false,
    });
  });

  it("leaves out a test that is still open or waiting on a reviewer", () => {
    expect(computeAssessmentResult([attempt({ status: "pending", scorePercentage: null, passed: null })], now).score).toBeNull();
    expect(computeAssessmentResult([attempt({ status: "started", scorePercentage: null, passed: null })], now).score).toBeNull();
    expect(computeAssessmentResult([attempt({ scorePercentage: null, passed: null })], now).score).toBeNull();
  });

  it("counts a test whose link ran out unused as 0 and flags it", () => {
    const unused = attempt({ status: "pending", expiresAt: past, scorePercentage: null, passed: null });
    expect(computeAssessmentResult([unused], now)).toEqual({ score: 0, passed: null, expired: true });
    expect(computeAssessmentResult([attempt({ status: "expired", scorePercentage: null, passed: null })], now).score).toBe(0);
  });

  it("uses only the latest attempt of each test", () => {
    const old = attempt({ status: "expired", scorePercentage: null, passed: null });
    const retry = attempt({ scorePercentage: 90, passed: true });
    expect(computeAssessmentResult([old, retry], now)).toEqual({ score: 90, passed: true, expired: false });
  });

  it("averages several tests, and fails the candidate if any one failed", () => {
    const a = attempt({ assessmentId: 1, scorePercentage: 90, passed: true });
    const b = attempt({ assessmentId: 2, scorePercentage: 50, passed: false });
    expect(computeAssessmentResult([a, b], now)).toEqual({ score: 70, passed: false, expired: false });
  });
});
