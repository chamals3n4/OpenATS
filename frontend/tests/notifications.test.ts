import { describe, expect, it } from "vitest";
import { describeNotification, type ApiNotification } from "@/lib/notifications";
import { overlapsBusy } from "@/app/(dashboard)/_lib/interview-display";
import { zoneLabel } from "@/app/interview/_lib/viewer-time-zone";

const base: ApiNotification = {
  id: 1,
  type: "application_received",
  candidateId: 7,
  jobId: 3,
  candidateName: "Ada Lovelace",
  jobTitle: "Engineer",
  readAt: null,
  createdAt: "2026-11-03T08:00:00.000Z",
};

describe("describeNotification", () => {
  it("names the candidate and the job, and links to the candidate", () => {
    expect(describeNotification(base)).toEqual({
      kind: "application",
      title: "New application",
      detail: "Ada Lovelace applied for Engineer.",
      href: "/candidates/7",
    });
  });

  it("opens the tab the notification is about", () => {
    expect(describeNotification({ ...base, type: "interview_booked" }).href).toBe("/candidates/7?section=interviews");
    expect(describeNotification({ ...base, type: "offer_accepted" }).href).toBe("/candidates/7?section=offer");
    expect(describeNotification({ ...base, type: "assignment_submitted" }).href).toBe("/candidates/7?section=assignments");
    expect(describeNotification({ ...base, type: "email_failed" }).href).toBe("/candidates/7?section=email");
  });

  it("still reads well without a name or a job", () => {
    const text = describeNotification({ ...base, type: "offer_declined", candidateName: null, jobTitle: null });
    expect(text.detail).toBe("A candidate declined the offer.");
  });

  it("does not break on a kind it does not know yet", () => {
    expect(describeNotification({ ...base, type: "something_new" }).title).toBe("Update");
  });
});

describe("overlapsBusy", () => {
  const busy = [{ start: "2031-01-20T10:00:00.000Z", end: "2031-01-20T11:00:00.000Z" }];

  it("is taken when any part overlaps, not only at the same start", () => {
    expect(overlapsBusy("2031-01-20T10:30:00.000Z", 60, busy)).toBe(true);
    expect(overlapsBusy("2031-01-20T09:30:00.000Z", 60, busy)).toBe(true);
  });

  it("is free when it ends as the other starts, or starts as it ends", () => {
    expect(overlapsBusy("2031-01-20T09:00:00.000Z", 60, busy)).toBe(false);
    expect(overlapsBusy("2031-01-20T11:00:00.000Z", 30, busy)).toBe(false);
  });

  it("is free with no time set", () => {
    expect(overlapsBusy("", 60, busy)).toBe(false);
  });
});

describe("zoneLabel", () => {
  it("gives the name and the offset", () => {
    expect(zoneLabel("Asia/Colombo", new Date("2026-11-03T00:00:00Z"))).toBe("Asia/Colombo (GMT+5:30)");
  });

  it("follows daylight saving on the day asked about", () => {
    expect(zoneLabel("Europe/London", new Date("2026-07-01T12:00:00Z"))).toBe("Europe/London (GMT+1)");
    // Written "GMT" or "GMT+0" depending on the date library's version.
    expect(zoneLabel("Europe/London", new Date("2026-12-01T12:00:00Z"))).toMatch(/^Europe\/London \(GMT(\+0)?\)$/);
  });

  it("writes underscores as spaces", () => {
    expect(zoneLabel("America/New_York", new Date("2026-12-01T12:00:00Z"))).toBe("America/New York (GMT-5)");
  });
});
