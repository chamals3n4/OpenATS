import { describe, it, expect } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  daysInStage,
  hasCandidateFilters,
  matchesFilters,
  type BoardFilters,
} from "@/app/(dashboard)/jobs/[id]/pipeline/lib/board-filters";
import type { BoardCandidate } from "@/types";

const NOW = new Date("2026-06-30T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const cand = (extra: Partial<BoardCandidate> = {}): BoardCandidate => ({
  id: 1,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@math.org",
  jobId: 1,
  currentStageId: 10,
  status: "active",
  appliedAt: daysAgo(20),
  updatedAt: daysAgo(1),
  stageEnteredAt: daysAgo(5),
  ...extra,
});
const withFilters = (f: Partial<BoardFilters>): BoardFilters => ({ ...EMPTY_FILTERS, ...f });

describe("daysInStage", () => {
  it("counts from when the candidate entered the stage", () => {
    expect(daysInStage(cand({ stageEnteredAt: daysAgo(5) }), NOW)).toBe(5);
  });
  it("falls back to the day they applied when no move is recorded", () => {
    expect(daysInStage(cand({ stageEnteredAt: null, appliedAt: daysAgo(12) }), NOW)).toBe(12);
  });
  it("never goes negative", () => {
    expect(daysInStage(cand({ stageEnteredAt: daysAgo(-2) }), NOW)).toBe(0);
  });
});

describe("matchesFilters", () => {
  it("matches everything with no filters", () => {
    expect(matchesFilters(cand(), EMPTY_FILTERS, NOW)).toBe(true);
  });

  it("filters by status", () => {
    expect(matchesFilters(cand({ status: "hired" }), withFilters({ status: "hired" }), NOW)).toBe(true);
    expect(matchesFilters(cand({ status: "active" }), withFilters({ status: "hired" }), NOW)).toBe(false);
  });

  it("filters by how long ago they applied", () => {
    const c = cand({ appliedAt: daysAgo(20) });
    expect(matchesFilters(c, withFilters({ applied: "7d" }), NOW)).toBe(false);
    expect(matchesFilters(c, withFilters({ applied: "30d" }), NOW)).toBe(true);
    expect(matchesFilters(c, withFilters({ applied: "over30d" }), NOW)).toBe(false);
    expect(matchesFilters(cand({ appliedAt: daysAgo(45) }), withFilters({ applied: "over30d" }), NOW)).toBe(true);
  });

  it("filters candidates who have waited N days or more in a stage", () => {
    const c = cand({ stageEnteredAt: daysAgo(8) });
    expect(matchesFilters(c, withFilters({ inStage: "7" }), NOW)).toBe(true);
    expect(matchesFilters(c, withFilters({ inStage: "14" }), NOW)).toBe(false);
  });

  it("combines every filter, all of which must match", () => {
    const f = withFilters({ search: "ada", status: "active", inStage: "3" });
    expect(matchesFilters(cand(), f, NOW)).toBe(true);
    expect(matchesFilters(cand({ firstName: "Grace", email: "g@x.com" }), f, NOW)).toBe(false);
  });
});

describe("filter counts", () => {
  it("counts the filters on, leaving the search box out", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(activeFilterCount(withFilters({ search: "x", stageIds: [1, 2], status: "hired" }))).toBe(2);
  });
  it("knows when a candidate filter is on, but not for a stage-columns-only filter", () => {
    expect(hasCandidateFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasCandidateFilters(withFilters({ stageIds: [1] }))).toBe(false);
    expect(hasCandidateFilters(withFilters({ search: " ada " }))).toBe(true);
    expect(hasCandidateFilters(withFilters({ inStage: "7" }))).toBe(true);
  });
});
