import { describe, it, expect } from "vitest";
import { EMAIL_BRAND_COLOR, renderEmailLayout } from "../../src/shared/services/email-layout";
import {
  applicationReceivedEmail,
  interviewConfirmedEmail,
  interviewSlotsEmail,
  offerEmail,
  writtenEmail,
} from "../../src/shared/services/candidate-emails";
import { templateEngineService } from "../../src/modules/template/template-engine.service";

describe("renderEmailLayout", () => {
  const html = renderEmailLayout({ companyName: "Acme & Co", heading: "Hello", bodyHtml: "<p>Body</p>" });

  it("uses the brand colour, a border and square corners", () => {
    expect(html).toContain(`background:${EMAIL_BRAND_COLOR}`);
    expect(html).toContain("border:1px solid");
    expect(html).not.toMatch(/border-radius:(1[0-9]|[5-9]|9999)px/);
  });

  it("names the company, escaped, and keeps the body as given", () => {
    expect(html).toContain("Acme &amp; Co");
    expect(html).toContain("<p>Body</p>");
  });
});

describe("built-in emails", () => {
  it("escape a candidate's name, which the candidate typed themselves", () => {
    const { html } = applicationReceivedEmail({
      companyName: "Acme",
      candidateName: '<img src=x onerror="alert(1)">',
      jobTitle: "Engineer",
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("put the link to pick a time in the slot email", () => {
    const { subject, html } = interviewSlotsEmail({
      companyName: "Acme",
      candidateName: "Ada Lovelace",
      eventName: "Technical interview",
      jobTitle: "Engineer",
      eventType: "onsite",
      meetingUrl: null,
      location: "12 Park Street",
      bodyText: "See you soon.\nBring ID.",
      publicUrl: "https://ats.example/interview/abc",
    });
    expect(subject).toBe("Technical interview — Engineer");
    expect(html).toContain('href="https://ats.example/interview/abc"');
    expect(html).toContain("12 Park Street");
    expect(html).toContain("See you soon.<br>Bring ID.");
    expect(html).toContain("On-site");
  });

  it("show the join button only when there is a meeting link", () => {
    const base = {
      companyName: "Acme",
      candidateName: "Ada",
      eventName: "Technical interview",
      eventType: "virtual",
      scheduledAt: new Date("2026-11-02T10:00:00Z"),
      durationMinutes: 60,
      location: null,
    };
    expect(interviewConfirmedEmail({ ...base, meetingUrl: "https://meet.example/x" }).html).toContain(
      "Join the meeting",
    );
    expect(interviewConfirmedEmail({ ...base, meetingUrl: null }).html).not.toContain("Join the meeting");
  });

  it("link the offer email to the review page", () => {
    const { html } = offerEmail({
      companyName: "Acme",
      candidateName: "Ada",
      jobTitle: "Engineer",
      reviewUrl: "https://ats.example/offer/tok",
    });
    expect(html).toContain('href="https://ats.example/offer/tok"');
  });

  it("wrap written content without changing it", () => {
    expect(writtenEmail({ companyName: "Acme", contentHtml: "<p>Dear Ada</p>" })).toContain("<p>Dear Ada</p>");
  });
});

describe("templateEngineService.missingVariables", () => {
  const context = { candidate_name: "Ada", job_title: "Engineer" };

  it("finds variables with no value, in the subject and the body", () => {
    expect(
      templateEngineService.missingVariables("About {{job_title}}", "<p>{{candidate_name}}, {{ salary }} {{salary}}</p>", context),
    ).toEqual(["salary"]);
  });

  it("returns nothing when every variable has a value", () => {
    expect(templateEngineService.missingVariables("{{job_title}}", "<p>Hi {{candidate_name}}</p>", context)).toEqual([]);
  });

  it("reads the older block format too", () => {
    expect(
      templateEngineService.missingVariables("Hi", [{ type: "text", content: "Start {{start_date}}" }], context),
    ).toEqual(["start_date"]);
  });
});
