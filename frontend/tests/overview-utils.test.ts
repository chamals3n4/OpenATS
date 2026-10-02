import { describe, it, expect } from "vitest";
import {
  ageLabel,
  buildKpis,
  daysAgo,
  fasterDelta,
  interviewWhen,
  percentDelta,
  pointsDelta,
} from "@/app/(dashboard)/lib/overview-utils";
import type { AnalyticsReport } from "@/types";

const summary = (extra: Partial<AnalyticsReport["summary"]> = {}): AnalyticsReport["summary"] => ({
  totalCandidates: 40,
  newCandidates: 12,
  totalCandidatesDeltaPct: 20,
  openPositions: 3,
  openPositionsDelta: 1,
  avgTimeToHireDays: 14.5,
  avgTimeToHireDeltaDays: 2,
  offersSent: 4,
  offerAcceptanceRate: 75,
  offerAcceptanceRateDeltaPct: 5,
  ...extra,
});
const kpi = (s: AnalyticsReport["summary"], key: string) => buildKpis(s).find((k) => k.key === key)!;

describe("deltas", () => {
  it("shows a gain in green and a drop in red, trimming a pointless .0", () => {
    expect(percentDelta(12.5)).toEqual({ text: "+12.5%", tone: "good" });
    expect(percentDelta(-4)).toEqual({ text: "-4%", tone: "bad" });
  });
  it("says 'No change' in neutral for zero, and shows nothing without a comparison", () => {
    expect(percentDelta(0)).toEqual({ text: "No change", tone: "neutral" });
    expect(percentDelta(null)).toBeNull();
    expect(pointsDelta(null)).toBeNull();
    expect(fasterDelta(null)).toBeNull();
  });
  it("counts rate changes in points", () => {
    expect(pointsDelta(5)).toEqual({ text: "+5 pts", tone: "good" });
    expect(pointsDelta(-2.5)).toEqual({ text: "-2.5 pts", tone: "bad" });
  });
  it("treats fewer days to hire as the good direction", () => {
    expect(fasterDelta(2)).toEqual({ text: "2 days faster", tone: "good" });
    expect(fasterDelta(1)).toEqual({ text: "1 day faster", tone: "good" });
    expect(fasterDelta(-3.5)).toEqual({ text: "3.5 days slower", tone: "bad" });
  });
});

describe("buildKpis", () => {
  it("builds the four figures with the period's own numbers", () => {
    const k = buildKpis(summary());
    expect(k.map((x) => x.key)).toEqual(["applications", "positions", "timeToHire", "offerRate"]);
    expect(kpi(summary(), "applications")).toMatchObject({ value: "12", hint: "40 candidates in total" });
    expect(kpi(summary(), "timeToHire")).toMatchObject({ value: "14.5", unit: "days" });
    expect(kpi(summary(), "offerRate").value).toBe("75%");
  });

  it("shows a dash and says why when there is no data, never a fake zero", () => {
    const empty = summary({ avgTimeToHireDays: null, avgTimeToHireDeltaDays: null, offerAcceptanceRate: null, offerAcceptanceRateDeltaPct: null, offersSent: 0 });
    expect(kpi(empty, "timeToHire")).toMatchObject({ value: "—", unit: undefined, delta: null });
    expect(kpi(empty, "timeToHire").hint).toBe("No offer was accepted in this period");
    expect(kpi(empty, "offerRate")).toMatchObject({ value: "—", delta: null });
    expect(kpi(empty, "offerRate").hint).toBe("No offer was sent in this period");
  });

  it("keeps a real 0% acceptance when offers were sent", () => {
    expect(kpi(summary({ offerAcceptanceRate: 0, offersSent: 3 }), "offerRate").value).toBe("0%");
  });

  it("marks only the offer rate as manager-only", () => {
    expect(buildKpis(summary()).filter((k) => k.managerOnly).map((k) => k.key)).toEqual(["offerRate"]);
  });

  it("uses the singular", () => {
    expect(kpi(summary({ totalCandidates: 1 }), "applications").hint).toBe("1 candidate in total");
    expect(kpi(summary({ avgTimeToHireDays: 1 }), "timeToHire").unit).toBe("day");
  });
});

describe("waiting times", () => {
  const now = new Date(2026, 5, 15, 12, 0).getTime();

  it("labels ages", () => {
    expect(ageLabel(0)).toBe("today");
    expect(ageLabel(1)).toBe("1 day");
    expect(ageLabel(23)).toBe("23 days");
    expect(daysAgo(new Date(now - 3 * 86_400_000).toISOString(), now)).toBe(3);
  });

  it("describes an interview as today, tomorrow or a dated day", () => {
    expect(interviewWhen(new Date(2026, 5, 15, 14, 30).toISOString(), now)).toMatch(/^Today, /);
    expect(interviewWhen(new Date(2026, 5, 16, 9, 0).toISOString(), now)).toMatch(/^Tomorrow, /);
    const later = interviewWhen(new Date(2026, 5, 18, 9, 0).toISOString(), now);
    expect(later).not.toMatch(/^Today|^Tomorrow/);
    expect(later).toContain(",");
    expect(interviewWhen("nonsense", now)).toBe("");
  });
});
