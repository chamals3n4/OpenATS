import { describe, it, expect } from "vitest";
import { dayKey, groupByDay, monthGrid } from "@/app/(dashboard)/interviews/_lib/calendar-utils";

describe("monthGrid", () => {
  it("covers the month in whole weeks, Sunday first, padded with the neighbouring months", () => {
    // October 2026 starts on a Thursday and has 31 days.
    const days = monthGrid(2026, 9);
    expect(days).toHaveLength(35);
    expect(days[0]).toMatchObject({ key: "2026-09-27", inMonth: false });
    expect(days[4]).toMatchObject({ key: "2026-10-01", inMonth: true });
    expect(days[34]).toMatchObject({ key: "2026-10-31", inMonth: true });
  });

  it("uses six weeks when the month needs them, and four when it fits", () => {
    expect(monthGrid(2026, 7)).toHaveLength(42); // August 2026: starts on a Saturday
    expect(monthGrid(2026, 1)).toHaveLength(28); // February 2026: starts on a Sunday, 28 days
  });
});

describe("groupByDay", () => {
  it("groups by local day, in time order, and leaves out interviews with no time", () => {
    const at = (h: number) => new Date(2026, 9, 12, h).toISOString();
    const byDay = groupByDay([
      { id: 1, scheduledAt: at(15) },
      { id: 2, scheduledAt: null },
      { id: 3, scheduledAt: at(9) },
      { id: 4, scheduledAt: "not a date" },
    ]);
    expect([...byDay.keys()]).toEqual([dayKey(new Date(2026, 9, 12))]);
    expect(byDay.get("2026-10-12")!.map((iv) => iv.id)).toEqual([3, 1]);
  });
});
