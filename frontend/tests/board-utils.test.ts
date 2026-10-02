import { describe, it, expect } from "vitest";
import {
  bulkMoveTargets,
  dropIndex,
  groupByStage,
  hasEffects,
  isFullyVisibleX,
  matchesSearch,
  toFullIndex,
  moveCard,
  moveEffects,
  timeAgo,
} from "@/app/(dashboard)/jobs/[id]/pipeline/lib/board-utils";
import type { BoardCandidate } from "@/types";

const card = (id: number, stage: number | null, extra: Partial<BoardCandidate> = {}): BoardCandidate => ({
  id,
  firstName: `F${id}`,
  lastName: `L${id}`,
  email: `c${id}@x.com`,
  jobId: 1,
  currentStageId: stage,
  status: "active",
  appliedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  stageEnteredAt: null,
  ...extra,
});
const ids = (list: BoardCandidate[], stage: number) =>
  list.filter((c) => c.currentStageId === stage).map((c) => c.id);

describe("groupByStage", () => {
  it("keeps each column in the order it arrived in and groups stage-less cards", () => {
    const g = groupByStage([card(1, 10), card(2, 20), card(3, 10), card(4, null)]);
    expect(g.get(10)?.map((c) => c.id)).toEqual([1, 3]);
    expect(g.get(20)?.map((c) => c.id)).toEqual([2]);
    expect(g.get(-1)?.map((c) => c.id)).toEqual([4]);
  });
});

describe("moveCard", () => {
  const list = [card(1, 10), card(2, 10), card(3, 10), card(4, 20)];

  it("moves across columns to the slot dropped on", () => {
    const next = moveCard(list, 4, 10, 1);
    expect(ids(next, 10)).toEqual([1, 4, 2, 3]);
    expect(ids(next, 20)).toEqual([]);
  });

  it("moves into an empty column", () => {
    expect(ids(moveCard(list, 1, 30, 0), 30)).toEqual([1]);
  });

  it("counts a downward move inside a column against the slots as drawn", () => {
    // Dropping card 1 in the gap below card 2 (slot 2) puts it between 2 and 3.
    expect(ids(moveCard(list, 1, 10, 2), 10)).toEqual([2, 1, 3]);
    // The slot at the very end.
    expect(ids(moveCard(list, 1, 10, 3), 10)).toEqual([2, 3, 1]);
  });

  it("moves up inside a column", () => {
    expect(ids(moveCard(list, 3, 10, 0), 10)).toEqual([3, 1, 2]);
  });

  it("returns the same list when the drop changes nothing", () => {
    expect(moveCard(list, 2, 10, 1)).toBe(list);
    expect(moveCard(list, 2, 10, 2)).toBe(list);
  });

  it("clamps a slot past the end and ignores an unknown card", () => {
    expect(ids(moveCard(list, 4, 10, 99), 10)).toEqual([1, 2, 3, 4]);
    expect(moveCard(list, 99, 10, 0)).toBe(list);
  });

  it("does not change the list it was given", () => {
    moveCard(list, 4, 10, 0);
    expect(ids(list, 10)).toEqual([1, 2, 3]);
  });

  it("updates the moved card's stage", () => {
    expect(moveCard(list, 4, 10, 0).find((c) => c.id === 4)?.currentStageId).toBe(10);
  });
});

describe("dropIndex", () => {
  const rects = [
    { top: 0, bottom: 50 },
    { top: 60, bottom: 110 },
    { top: 120, bottom: 170 },
  ];
  it("picks the slot before the first card whose middle is below the pointer", () => {
    expect(dropIndex(rects, 10)).toBe(0);
    expect(dropIndex(rects, 40)).toBe(1);
    expect(dropIndex(rects, 100)).toBe(2);
  });
  it("falls to the end below every card and to 0 for an empty column", () => {
    expect(dropIndex(rects, 400)).toBe(3);
    expect(dropIndex([], 10)).toBe(0);
  });
});

describe("moveEffects", () => {
  it("flags an offer stage and a stage with an assessment attached", () => {
    const offer = moveEffects({ id: 3, stageType: "offer" }, new Set());
    expect(offer).toEqual({ createsOffer: true, sendsAssessment: false });
    const test = moveEffects({ id: 2, stageType: "screening" }, new Set([2]));
    expect(test).toEqual({ createsOffer: false, sendsAssessment: true });
    expect(hasEffects(moveEffects({ id: 1, stageType: "interview" }, new Set()))).toBe(false);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  it("steps from minutes to weeks", () => {
    expect(timeAgo(ago(20_000), now)).toBe("just now");
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5m ago");
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3h ago");
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe("2d ago");
    expect(timeAgo(ago(21 * 86_400_000), now)).toBe("3w ago");
  });
  it("never goes negative for a clock that is slightly behind", () => {
    expect(timeAgo(ago(-5000), now)).toBe("just now");
  });
});

describe("matchesSearch", () => {
  it("matches name or email, ignoring case, and everything when empty", () => {
    const c = card(1, 10, { firstName: "Ada", lastName: "Lovelace", email: "ada@math.org" });
    expect(matchesSearch(c, "LOVE")).toBe(true);
    expect(matchesSearch(c, "math.org")).toBe(true);
    expect(matchesSearch(c, "grace")).toBe(false);
    expect(matchesSearch(c, "  ")).toBe(true);
  });
});

describe("toFullIndex", () => {
  const full = [card(1, 10), card(2, 10), card(3, 10), card(4, 10)];
  const visible = [full[1], full[3]]; // 2 and 4 match the search

  it("is the same slot when nothing is hidden", () => {
    expect(toFullIndex(full, full, 2)).toBe(2);
  });
  it("lands before the visible card dropped on, however many hidden ones sit above it", () => {
    expect(toFullIndex(full, visible, 0)).toBe(1);
    expect(toFullIndex(full, visible, 1)).toBe(3);
  });
  it("lands right after the last visible card when dropped below it", () => {
    expect(toFullIndex(full, visible, 2)).toBe(4);
    expect(toFullIndex(full, [full[0]], 1)).toBe(1);
  });
  it("goes to the end when every card is hidden", () => {
    expect(toFullIndex(full, [], 0)).toBe(4);
  });
});

describe("isFullyVisibleX", () => {
  const outer = { left: 100, right: 500 };
  it("is true only when the whole column is inside the board", () => {
    expect(isFullyVisibleX({ left: 120, right: 480 }, outer)).toBe(true);
    expect(isFullyVisibleX({ left: 80, right: 300 }, outer)).toBe(false);
    expect(isFullyVisibleX({ left: 300, right: 700 }, outer)).toBe(false);
  });
});

describe("bulkMoveTargets", () => {
  const stages = [{ id: 10 }, { id: 20 }, { id: 30 }];
  it("leaves out the stage every selected candidate is already in", () => {
    const picked = [card(1, 10), card(2, 10)];
    expect(bulkMoveTargets(stages, picked).map((s) => s.id)).toEqual([20, 30]);
  });
  it("offers every stage when the selection is spread across stages", () => {
    const picked = [card(1, 10), card(2, 20)];
    expect(bulkMoveTargets(stages, picked).map((s) => s.id)).toEqual([10, 20, 30]);
  });
  it("offers every stage when nothing is selected", () => {
    expect(bulkMoveTargets(stages, [])).toEqual(stages);
  });
});
