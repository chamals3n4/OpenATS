import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterChips,
  clearFilter,
  filtersMenuCount,
  hasFilterParams,
  parseFilterState,
  resolveFilterState,
  toFilterParams,
} from "@/app/(dashboard)/candidates/lib/candidate-filter-state";

const jobs = [{ id: 3, title: "Software Engineering Intern" }];

describe("filters in the address", () => {
  it("writes nothing for the defaults, and only what differs otherwise", () => {
    expect(toFilterParams(EMPTY_FILTERS).toString()).toBe("");
    const p = toFilterParams({ ...EMPTY_FILTERS, jobId: 3, minScore: 70, flag: "none", fullyScored: true, sort: "score" });
    expect(p.get("job")).toBe("3");
    expect(p.get("minScore")).toBe("70");
    expect(p.get("flag")).toBe("none");
    expect(p.get("fullyScored")).toBe("true");
    expect(p.get("sort")).toBe("score");
    expect(p.has("status")).toBe(false);
  });

  it("round-trips, including a minimum score of 0", () => {
    const state = { ...EMPTY_FILTERS, jobId: 3, status: "active" as const, minScore: 0, flag: "flagged" as const };
    expect(parseFilterState(toFilterParams(state))).toEqual(state);
  });

  it("ignores values that are not valid", () => {
    const p = new URLSearchParams("job=abc&status=bogus&flag=nope&minScore=x&sort=weird");
    expect(parseFilterState(p)).toEqual(EMPTY_FILTERS);
    expect(parseFilterState(new URLSearchParams("minScore=500")).minScore).toBe(100);
    expect(parseFilterState(new URLSearchParams("job=-4")).jobId).toBeUndefined();
  });
});

describe("filter chips", () => {
  it("shows no chips when nothing is on", () => {
    expect(activeFilterChips(EMPTY_FILTERS, jobs)).toEqual([]);
  });

  it("has one chip per filter that is on, naming the position", () => {
    const chips = activeFilterChips(
      { ...EMPTY_FILTERS, jobId: 3, minScore: 70, flag: "none", fullyScored: true, status: "active" },
      jobs,
    );
    expect(chips.map((c) => c.label)).toEqual([
      "Software Engineering Intern",
      "Active",
      "Score 70+",
      "No flags",
      "All parts scored",
    ]);
  });

  it("falls back to a generic name for a position it cannot find", () => {
    expect(activeFilterChips({ ...EMPTY_FILTERS, jobId: 99 }, jobs)[0]!.label).toBe("Selected position");
  });

  it("removing a chip clears just that filter", () => {
    const state = { ...EMPTY_FILTERS, jobId: 3, minScore: 70 };
    expect(clearFilter(state, "job")).toEqual({ ...EMPTY_FILTERS, minScore: 70 });
    expect(clearFilter(state, "minScore")).toEqual({ ...EMPTY_FILTERS, jobId: 3 });
  });

  it("counts only the filters that live inside the Filters menu", () => {
    expect(filtersMenuCount({ ...EMPTY_FILTERS, jobId: 3, sort: "score" })).toBe(0);
    expect(filtersMenuCount({ ...EMPTY_FILTERS, status: "active", minScore: 0, fullyScored: true })).toBe(3);
  });
});

describe("restoring saved filters", () => {
  it("uses the address when it has filters, and ignores what was saved", () => {
    const state = resolveFilterState(new URLSearchParams("job=3"), "job=4&flag=none");
    expect(state).toEqual({ ...EMPTY_FILTERS, jobId: 3 });
  });

  it("falls back to the saved filters when the address has none", () => {
    expect(resolveFilterState(new URLSearchParams(""), "job=4&flag=none")).toEqual({
      ...EMPTY_FILTERS,
      jobId: 4,
      flag: "none",
    });
  });

  it("is unfiltered when nothing is in the address or saved, which is what clearing leaves behind", () => {
    expect(resolveFilterState(new URLSearchParams(""), null)).toEqual(EMPTY_FILTERS);
  });

  it("knows whether the address carries any filter", () => {
    expect(hasFilterParams(new URLSearchParams("job=3"))).toBe(true);
    expect(hasFilterParams(new URLSearchParams("from=candidates"))).toBe(false);
  });
});
