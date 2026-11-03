import { describe, expect, it } from "vitest";
import { pickRecipients } from "../../src/shared/services/notification-types";
import { interviewerBookedEmail } from "../../src/shared/services/staff-emails";

describe("pickRecipients", () => {
  it("is the team plus the extra people, each once, without whoever did it", () => {
    expect(pickRecipients({ team: [1, 2, 3], also: [3, 9], exclude: 2 }).sort()).toEqual([1, 3, 9]);
  });

  it("leaves the person who did it out even when they were named on purpose", () => {
    expect(pickRecipients({ team: [1], also: [4], exclude: 4 })).toEqual([1]);
  });

  it("is everyone when nobody is left out", () => {
    expect(pickRecipients({ team: [5], exclude: null })).toEqual([5]);
  });
});

describe("interviewerBookedEmail", () => {
  const base = {
    companyName: "Acme",
    timeZone: "Asia/Colombo",
    interviewerName: "Nimal",
    candidateName: "Ada <Lovelace>",
    jobTitle: "Engineer",
    eventName: "Technical",
    eventType: "virtual",
    scheduledAt: new Date("2026-11-05T04:30:00Z"),
    durationMinutes: 45,
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    location: null,
    candidateUrl: "https://ats.example.test/candidates/7?section=interviews",
  };

  it("gives the time in the company's zone, names the zone, and links the meeting and the candidate", () => {
    const { subject, html } = interviewerBookedEmail(base);
    expect(subject).toContain("10:00");
    expect(html).toContain("Asia/Colombo");
    expect(html).toContain("https://meet.google.com/abc-defg-hij");
    expect(html).toContain("https://ats.example.test/candidates/7?section=interviews");
    expect(html).toContain("45 minutes");
  });

  it("escapes what came from people", () => {
    const { html } = interviewerBookedEmail(base);
    expect(html).toContain("Ada &lt;Lovelace&gt;");
    expect(html).not.toContain("<Lovelace>");
  });

  it("says when a virtual interview has no link yet", () => {
    expect(interviewerBookedEmail({ ...base, meetingUrl: null }).html).toContain("None yet");
    expect(interviewerBookedEmail({ ...base, meetingUrl: null, eventType: "onsite", location: "HQ" }).html).not.toContain(
      "None yet",
    );
  });
});
