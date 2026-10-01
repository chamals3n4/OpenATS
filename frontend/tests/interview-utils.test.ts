import { describe, it, expect } from "vitest";
import {
  eventTypeLabel,
  groupInterviews,
  meetingProvider,
  relativeDay,
  safeMeetingUrl,
} from "@/app/(dashboard)/candidates/[id]/lib/interview-utils";
import type { CandidateInterview } from "@/types";

const iv = (id: number, over: Partial<CandidateInterview> = {}): CandidateInterview =>
  ({
    id,
    status: "scheduled",
    scheduledAt: null,
    ...over,
  }) as CandidateInterview;

const now = new Date("2026-09-09T12:00:00").getTime();
const at = (iso: string) => new Date(iso).toISOString();

describe("groupInterviews", () => {
  it("splits upcoming from past and sorts each sensibly", () => {
    const groups = groupInterviews(
      [
        iv(1, { scheduledAt: at("2026-09-12T10:00:00") }),
        iv(2, { scheduledAt: at("2026-09-10T10:00:00") }),
        iv(3, { status: "completed", scheduledAt: at("2026-09-01T10:00:00") }),
        iv(4, { status: "completed", scheduledAt: at("2026-09-05T10:00:00") }),
      ],
      now,
    );
    expect(groups.upcoming.map((i) => i.id)).toEqual([2, 1]); // soonest first
    expect(groups.past.map((i) => i.id)).toEqual([4, 3]); // latest first
  });

  it("keeps interviews still waiting for a time at the front of upcoming", () => {
    const groups = groupInterviews(
      [
        iv(1, { scheduledAt: at("2026-09-10T10:00:00") }),
        iv(2, { status: "pending_schedule" }),
      ],
      now,
    );
    expect(groups.upcoming.map((i) => i.id)).toEqual([2, 1]);
  });

  it("treats a confirmed interview whose time has passed as past", () => {
    const groups = groupInterviews([iv(1, { scheduledAt: at("2026-09-08T10:00:00") })], now);
    expect(groups.past.map((i) => i.id)).toEqual([1]);
    expect(groups.upcoming).toEqual([]);
  });

  it("puts cancelled interviews in the past even with a future time", () => {
    const groups = groupInterviews(
      [iv(1, { status: "cancelled", scheduledAt: at("2026-09-20T10:00:00") })],
      now,
    );
    expect(groups.past.map((i) => i.id)).toEqual([1]);
  });
});

describe("relativeDay", () => {
  it("speaks in calendar days", () => {
    expect(relativeDay(at("2026-09-09T23:30:00"), now)).toBe("Today");
    expect(relativeDay(at("2026-09-10T08:00:00"), now)).toBe("Tomorrow");
    expect(relativeDay(at("2026-09-12T08:00:00"), now)).toBe("In 3 days");
    expect(relativeDay(at("2026-09-08T20:00:00"), now)).toBe("Yesterday");
    expect(relativeDay(at("2026-09-04T08:00:00"), now)).toBe("5 days ago");
  });
});

describe("labels", () => {
  it("names the interview format", () => {
    expect(eventTypeLabel("virtual")).toBe("Virtual");
    expect(eventTypeLabel("onsite")).toBe("On site");
    expect(eventTypeLabel(null)).toBe("Virtual");
  });

  it("names the meeting provider", () => {
    expect(meetingProvider("https://meet.google.com/mth-yqii-ybq")).toBe("Google Meet");
    expect(meetingProvider("https://us02web.zoom.us/j/123")).toBe("Zoom");
    expect(meetingProvider("https://example.com/room")).toBe("example.com");
    expect(meetingProvider("not a url")).toBe("Meeting link");
  });
});

describe("safeMeetingUrl", () => {
  it("allows web links only", () => {
    expect(safeMeetingUrl("https://meet.google.com/abc")).toBe("https://meet.google.com/abc");
    expect(safeMeetingUrl("javascript:alert(1)")).toBeNull();
    expect(safeMeetingUrl("data:text/html,hi")).toBeNull();
    expect(safeMeetingUrl("nonsense")).toBeNull();
    expect(safeMeetingUrl(null)).toBeNull();
  });
});
