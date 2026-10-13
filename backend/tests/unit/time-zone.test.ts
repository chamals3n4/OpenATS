import { describe, it, expect } from "vitest";
import { formatEmailDate, formatEmailTime, isTimeZone } from "../../src/shared/services/time-zone";
import { interviewConfirmedEmail } from "../../src/shared/services/candidate-emails";

// 09:30 UTC is 3:00 PM in Colombo (UTC+5:30).
const INTERVIEW = new Date("2026-11-02T09:30:00Z");

describe("formatEmailTime", () => {
  it("writes the time in the company's zone, with the offset and the zone's name", () => {
    expect(formatEmailTime(INTERVIEW, "Asia/Colombo")).toBe("3:00 PM GMT+5:30 (Asia/Colombo)");
  });

  it("writes UTC when no zone is given, and says so", () => {
    expect(formatEmailTime(INTERVIEW)).toBe("9:30 AM UTC");
  });

  it("reads a zone name with an underscore as words", () => {
    expect(formatEmailTime(INTERVIEW, "America/New_York")).toContain("(America/New York)");
  });
});

describe("formatEmailDate", () => {
  it("uses the day it is in the company's zone, not on the server", () => {
    // 20:00 UTC on Sunday is already Monday morning in Colombo.
    const lateSunday = new Date("2026-11-01T20:00:00Z");
    expect(formatEmailDate(lateSunday, "Asia/Colombo")).toBe("Monday, November 2, 2026");
    expect(formatEmailDate(lateSunday)).toBe("Sunday, November 1, 2026");
  });
});

describe("isTimeZone", () => {
  it("accepts real zone names", () => {
    expect(isTimeZone("Asia/Colombo")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isTimeZone("Colombo")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone("Asia/Colombo; drop table")).toBe(false);
  });
});

describe("an interview confirmation email", () => {
  it("gives the time in the company's zone", () => {
    const email = interviewConfirmedEmail({
      companyName: "Acme",
      timeZone: "Asia/Colombo",
      candidateName: "Nimal Fernando",
      eventName: "Technical interview",
      eventType: "virtual",
      scheduledAt: INTERVIEW,
      durationMinutes: 60,
      meetingUrl: "https://meet.example.test/x",
      location: null,
      bodyText: null,
    } as Parameters<typeof interviewConfirmedEmail>[0]);

    expect(email.html).toContain("3:00 PM GMT+5:30 (Asia/Colombo)");
    expect(email.html).not.toContain("9:30 AM");
  });
});
