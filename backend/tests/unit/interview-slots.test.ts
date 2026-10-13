import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/db", () => ({ db: {} }));
vi.mock("../../src/modules/interview/interview-confirm", () => ({ DEFAULT_INTERVIEW_MINUTES: 60 }));

import { overlapsBusy } from "../../src/modules/interview/interview-slots";

const at = (time: string) => new Date(`2026-11-02T${time}:00Z`);
const busy = (from: string, to: string) => [{ start: at(from).getTime(), end: at(to).getTime() }];

describe("overlapsBusy", () => {
  it("is taken at the same start time", () => {
    expect(overlapsBusy(at("10:00"), 60, busy("10:00", "11:00"))).toBe(true);
  });

  it("is taken when it starts while another interview is still running", () => {
    // The case the old check missed: a 60 minute interview at 10:00, and a slot at 10:30.
    expect(overlapsBusy(at("10:30"), 60, busy("10:00", "11:00"))).toBe(true);
  });

  it("is taken when it would still be running as another interview starts", () => {
    expect(overlapsBusy(at("09:30"), 60, busy("10:00", "11:00"))).toBe(true);
  });

  it("is free when it ends exactly as the next one starts, or starts as the last one ends", () => {
    expect(overlapsBusy(at("09:00"), 60, busy("10:00", "11:00"))).toBe(false);
    expect(overlapsBusy(at("11:00"), 60, busy("10:00", "11:00"))).toBe(false);
  });

  it("uses the interview's own length", () => {
    expect(overlapsBusy(at("09:30"), 30, busy("10:00", "11:00"))).toBe(false);
    expect(overlapsBusy(at("09:30"), 45, busy("10:00", "11:00"))).toBe(true);
  });

  it("takes an interview with no length as 60 minutes", () => {
    expect(overlapsBusy(at("09:30"), null, busy("10:00", "11:00"))).toBe(true);
    expect(overlapsBusy(at("09:00"), null, busy("10:00", "11:00"))).toBe(false);
  });

  it("is free when nothing is booked", () => {
    expect(overlapsBusy(at("10:00"), 60, [])).toBe(false);
  });
});
