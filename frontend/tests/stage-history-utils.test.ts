import { describe, it, expect } from "vitest";
import {
  buildTimeline,
  summarizeTimeline,
} from "@/app/(dashboard)/candidates/[id]/lib/stage-history-utils";
import { formatElapsed } from "@/app/(dashboard)/candidates/[id]/lib/format-elapsed";

const at = (iso: string) => new Date(iso).getTime();
const entry = (id: number, stageId: number, movedAt: string, movedBy: number | null = 1) => ({
  id,
  stageId,
  movedBy,
  movedAt,
});

describe("buildTimeline", () => {
  const history = [
    entry(1, 8, "2026-09-09T09:00:00Z", null),
    entry(2, 9, "2026-09-09T09:40:00Z"),
    entry(3, 11, "2026-09-09T10:10:00Z"),
  ];
  const now = at("2026-09-09T12:10:00Z");

  it("is newest first and flags the current and first entries", () => {
    const items = buildTimeline(history, now);
    expect(items.map((i) => i.stageId)).toEqual([11, 9, 8]);
    expect(items[0].isCurrent).toBe(true);
    expect(items[2].isFirst).toBe(true);
    expect(items[1].isCurrent || items[1].isFirst).toBe(false);
  });

  it("measures each stage until the next move, and the current one until now", () => {
    const items = buildTimeline(history, now);
    expect(items[0].durationMs).toBe(2 * 3600000); // 10:10 -> 12:10
    expect(items[1].durationMs).toBe(30 * 60000); // 09:40 -> 10:10
    expect(items[2].durationMs).toBe(40 * 60000); // 09:00 -> 09:40
  });

  it("does not depend on the order the API returns the rows in", () => {
    const shuffled = [history[2], history[0], history[1]];
    expect(buildTimeline(shuffled, now).map((i) => i.stageId)).toEqual([11, 9, 8]);
  });

  it("never reports a negative duration", () => {
    const items = buildTimeline([entry(1, 8, "2026-09-09T09:00:00Z")], at("2026-09-09T08:00:00Z"));
    expect(items[0].durationMs).toBe(0);
  });

  it("handles a single entry", () => {
    const items = buildTimeline([entry(1, 8, "2026-09-09T09:00:00Z", null)], now);
    expect(items).toHaveLength(1);
    expect(items[0].isCurrent && items[0].isFirst).toBe(true);
  });
});

describe("summarizeTimeline", () => {
  it("reports the current stage, the total time and the number of moves", () => {
    const now = at("2026-09-09T12:10:00Z");
    const items = buildTimeline(
      [
        entry(1, 8, "2026-09-09T09:00:00Z", null),
        entry(2, 9, "2026-09-09T09:40:00Z"),
        entry(3, 11, "2026-09-09T10:10:00Z"),
      ],
      now,
    );
    const summary = summarizeTimeline(items);
    expect(summary.current?.stageId).toBe(11);
    expect(summary.moves).toBe(2);
    expect(summary.totalMs).toBe(3 * 3600000 + 10 * 60000); // 09:00 -> 12:10
  });

  it("is empty for no history", () => {
    expect(summarizeTimeline([])).toEqual({ current: null, totalMs: 0, moves: 0 });
  });
});

describe("formatElapsed", () => {
  it("uses plain words, not abbreviations", () => {
    expect(formatElapsed(20_000)).toBe("Less than a minute");
    expect(formatElapsed(35 * 60000)).toBe("35 minutes");
    expect(formatElapsed(130 * 60000)).toBe("2 hours 10 minutes");
    expect(formatElapsed((3 * 24 + 4) * 3600000)).toBe("3 days 4 hours");
    expect(formatElapsed((22 * 24 + 6) * 3600000)).toBe("22 days 6 hours");
  });

  it("uses the singular for exactly one", () => {
    expect(formatElapsed(60000)).toBe("1 minute");
    expect(formatElapsed(60 * 60000)).toBe("1 hour");
    expect(formatElapsed(61 * 60000)).toBe("1 hour 1 minute");
    expect(formatElapsed(24 * 3600000)).toBe("1 day");
    expect(formatElapsed(25 * 3600000)).toBe("1 day 1 hour");
  });

  it("drops a zero remainder", () => {
    expect(formatElapsed(2 * 3600000)).toBe("2 hours");
    expect(formatElapsed(2 * 24 * 3600000)).toBe("2 days");
  });
});
