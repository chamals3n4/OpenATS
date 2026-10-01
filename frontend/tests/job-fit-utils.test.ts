import { describe, it, expect } from "vitest";
import {
  breakdownRows,
  normalizeScore,
  resolveVerdict,
  toneForVerdict,
  verdictFromScore,
} from "@/app/(dashboard)/candidates/[id]/lib/job-fit-utils";

describe("normalizeScore", () => {
  it("handles the string a Postgres numeric arrives as", () => {
    expect(normalizeScore("86.00")).toBe(86);
    expect(normalizeScore(85.6)).toBe(86);
  });

  it("is 0 for nothing or nonsense, and stays within 0 to 100", () => {
    expect(normalizeScore(null)).toBe(0);
    expect(normalizeScore(undefined)).toBe(0);
    expect(normalizeScore("abc")).toBe(0);
    expect(normalizeScore(140)).toBe(100);
    expect(normalizeScore(-5)).toBe(0);
  });
});

describe("verdicts", () => {
  it("is derived from the score when the analysis gave none", () => {
    expect(verdictFromScore(90)).toBe("strong_fit");
    expect(verdictFromScore(75)).toBe("strong_fit");
    expect(verdictFromScore(60)).toBe("moderate_fit");
    expect(verdictFromScore(35)).toBe("weak_fit");
    expect(verdictFromScore(10)).toBe("not_recommended");
  });

  it("lets the analysis's own verdict win over the score", () => {
    expect(resolveVerdict(90, "weak_fit")).toBe("weak_fit");
    expect(resolveVerdict(90, null)).toBe("strong_fit");
    expect(resolveVerdict(20, undefined)).toBe("not_recommended");
  });

  it("maps a verdict to a tone", () => {
    expect(toneForVerdict("strong_fit")).toBe("good");
    expect(toneForVerdict("moderate_fit")).toBe("fair");
    expect(toneForVerdict("weak_fit")).toBe("poor");
    expect(toneForVerdict("not_recommended")).toBe("poor");
  });
});

describe("breakdownRows", () => {
  it("lists the four parts with their maximums and fill", () => {
    const rows = breakdownRows({ skills: 41, experience: 25, level: 15, certs: 5 });
    expect(rows.map((r) => [r.key, r.points, r.max])).toEqual([
      ["skills", 41, 55],
      ["experience", 25, 25],
      ["level", 15, 15],
      ["certs", 5, 5],
    ]);
    expect(Math.round(rows[0].percent)).toBe(75);
    expect(rows[1].percent).toBe(100);
  });

  it("never fills past the end or below nothing", () => {
    const rows = breakdownRows({ skills: 80, experience: -3, level: 0, certs: 0 });
    expect(rows[0].percent).toBe(100);
    expect(rows[1].percent).toBe(0);
  });
});
