import { describe, it, expect } from "vitest";
import { insertAtPosition, parseUtcTimestamp } from "../../src/modules/candidate/candidate.service";

describe("insertAtPosition", () => {
  it("puts the candidate at the requested index and keeps the others in order", () => {
    expect(insertAtPosition([1, 2, 3], 9, 1)).toEqual([1, 9, 2, 3]);
    expect(insertAtPosition([1, 2, 3], 9, 0)).toEqual([9, 1, 2, 3]);
  });

  it("appends when no position is given", () => {
    expect(insertAtPosition([1, 2], 9, undefined)).toEqual([1, 2, 9]);
  });

  it("clamps a position past the end or below zero", () => {
    expect(insertAtPosition([1, 2], 9, 50)).toEqual([1, 2, 9]);
    expect(insertAtPosition([1, 2], 9, -3)).toEqual([9, 1, 2]);
  });

  it("works for an empty column", () => {
    expect(insertAtPosition([], 9, 0)).toEqual([9]);
  });

  it("does not change the list it was given", () => {
    const others = [1, 2];
    insertAtPosition(others, 9, 0);
    expect(others).toEqual([1, 2]);
  });
});

describe("parseUtcTimestamp", () => {
  it("reads a zone-less database timestamp as UTC", () => {
    expect(parseUtcTimestamp("2026-09-09 09:22:38.85742")?.toISOString()).toBe("2026-09-09T09:22:38.857Z");
  });
  it("returns null for nothing or nonsense", () => {
    expect(parseUtcTimestamp(null)).toBeNull();
    expect(parseUtcTimestamp("not a date")).toBeNull();
  });
});
