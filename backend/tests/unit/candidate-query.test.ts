import { describe, expect, it } from "vitest";
import { parseMinScore } from "../../src/modules/candidate/candidate-query";

describe("parseMinScore", () => {
  it("reads a single number, kept within 0-100", () => {
    expect(parseMinScore("70")).toBe(70);
    expect(parseMinScore(" 55.5 ")).toBe(55.5);
    expect(parseMinScore("0")).toBe(0);
    expect(parseMinScore("500")).toBe(100);
    expect(parseMinScore("-5")).toBe(0);
  });

  it("treats empty, blank and non-numeric values as no minimum", () => {
    expect(parseMinScore("")).toBeUndefined();
    expect(parseMinScore("   ")).toBeUndefined();
    expect(parseMinScore("abc")).toBeUndefined();
    expect(parseMinScore("Infinity")).toBeUndefined();
    expect(parseMinScore(undefined)).toBeUndefined();
  });

  it("does not let an array through, even though it would convert to a number", () => {
    expect(parseMinScore(["70"])).toBeUndefined();
    expect(parseMinScore(["70", "80"])).toBeUndefined();
    expect(parseMinScore([])).toBeUndefined();
  });
});
