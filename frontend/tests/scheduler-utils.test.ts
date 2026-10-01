import { describe, it, expect } from "vitest";
import {
  hasScheduleErrors,
  isFutureSlot,
  parseTemplate,
  validateSchedule,
  type ScheduleInput,
} from "@/app/(dashboard)/interviews/lib/scheduler-utils";

const now = new Date("2026-09-09T12:00:00").getTime();
const block = (content: string) => ({ content });

describe("parseTemplate", () => {
  it("reads the settings block and the email text block", () => {
    const cfg = parseTemplate(
      {
        name: "Tech round",
        bodyJson: [
          block(JSON.stringify({ eventType: "onsite", location: "HQ, 3rd floor", timeSlots: ["2026-09-12T10:00"] })),
          block("Hi, please pick a time."),
        ],
      },
      now,
    );
    expect(cfg).toMatchObject({
      eventType: "onsite",
      location: "HQ, 3rd floor",
      timeSlots: ["2026-09-12T10:00"],
      skippedPastSlots: 0,
      bodyText: "Hi, please pick a time.",
    });
  });

  it("drops slots that have already passed and says how many", () => {
    const cfg = parseTemplate(
      { name: "x", bodyJson: [block(JSON.stringify({ timeSlots: ["2026-09-01T10:00", "2026-09-12T10:00"] }))] },
      now,
    );
    expect(cfg.timeSlots).toEqual(["2026-09-12T10:00"]);
    expect(cfg.skippedPastSlots).toBe(1);
  });

  it("defaults to a virtual interview and survives a broken or missing config", () => {
    expect(parseTemplate({ name: "x", bodyJson: [block("{ not json")] }, now).eventType).toBe("virtual");
    expect(parseTemplate({ name: "x" }, now)).toMatchObject({ eventType: "virtual", timeSlots: [], bodyText: "" });
  });

  it("knows when the template wants a Google Meet link created", () => {
    const cfg = parseTemplate({ name: "x", bodyJson: [block(JSON.stringify({ autoGenerateMeet: true }))] }, now);
    expect(cfg.autoGenerate).toBe(true);
  });
});

describe("validateSchedule", () => {
  const valid: ScheduleInput = {
    templateId: "3",
    interviewerId: 1,
    bodyText: "Hello",
    slots: ["2026-09-12T10:00"],
    eventType: "virtual",
    linkMode: "manual",
    meetingUrl: "https://meet.google.com/abc",
  };

  it("accepts a complete schedule", () => {
    expect(hasScheduleErrors(validateSchedule(valid, now))).toBe(false);
  });

  it("asks for each missing part with a reason", () => {
    const e = validateSchedule(
      { ...valid, templateId: "", interviewerId: null, bodyText: " ", slots: [""], meetingUrl: "" },
      now,
    );
    expect(e.template).toBeTruthy();
    expect(e.interviewer).toBeTruthy();
    expect(e.body).toBeTruthy();
    expect(e.slots).toMatch(/at least one time/);
    expect(e.meetingUrl).toBe("Add the meeting link.");
  });

  it("flags a time that has passed on its own row", () => {
    const e = validateSchedule({ ...valid, slots: ["2026-09-12T10:00", "2026-09-01T10:00"] }, now);
    expect(e.slotErrors[1]).toBe("This time has already passed.");
    expect(e.slots).toBeUndefined();
  });

  it("needs a usable time even when the only one has passed", () => {
    const e = validateSchedule({ ...valid, slots: ["2026-09-01T10:00"] }, now);
    expect(e.slots).toMatch(/still in the future/);
  });

  it("flags the same time listed twice", () => {
    const e = validateSchedule({ ...valid, slots: ["2026-09-12T10:00", "2026-09-12T10:00"] }, now);
    expect(e.slotErrors[1]).toBe("This time is listed twice.");
  });

  it("checks the meeting link only when it is needed", () => {
    expect(validateSchedule({ ...valid, meetingUrl: "zoom please" }, now).meetingUrl).toMatch(/https/);
    expect(validateSchedule({ ...valid, linkMode: "auto", meetingUrl: "" }, now).meetingUrl).toBeUndefined();
    expect(validateSchedule({ ...valid, eventType: "onsite", meetingUrl: "" }, now).meetingUrl).toBeUndefined();
  });
});

describe("isFutureSlot", () => {
  it("accepts only parseable future times", () => {
    expect(isFutureSlot("2026-09-12T10:00", now)).toBe(true);
    expect(isFutureSlot("2026-09-01T10:00", now)).toBe(false);
    expect(isFutureSlot("nonsense", now)).toBe(false);
  });
});
