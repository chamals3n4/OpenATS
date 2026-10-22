import { describe, it, expect } from "vitest";
import { offerEmail } from "../../src/shared/services/candidate-emails";
import { previewSystemEmail } from "../../src/shared/services/system-email-preview";
import {
  SYSTEM_EMAILS,
  SYSTEM_EMAIL_PURPOSES,
  type SystemEmailPurpose,
} from "../../src/shared/services/system-emails";

const FROM = { companyName: "Acme Hiring", timeZone: "Asia/Colombo" };
const NOW = new Date("2026-10-13T08:00:00Z");
const preview = (purpose: SystemEmailPurpose, content = defaults(purpose)) =>
  previewSystemEmail(purpose, content, FROM, NOW);
const defaults = (purpose: SystemEmailPurpose) => ({
  subject: SYSTEM_EMAILS[purpose].subject,
  bodyHtml: SYSTEM_EMAILS[purpose].bodyHtml,
});

describe("the preview of an automatic email", () => {
  it.each(SYSTEM_EMAIL_PURPOSES)("is the whole email for %s, not only the message", (purpose) => {
    const email = preview(purpose);

    // The frame every real email has: the company above the card, and the footer.
    expect(email.html).toContain("Acme Hiring");
    expect(email.html).toContain("This email was sent by Acme Hiring about your application.");
    expect(email.html).toContain("<h1");
    // Every placeholder was filled with a sample value.
    expect(email.html).not.toMatch(/\{\{.*\}\}/);
    expect(email.subject).not.toMatch(/\{\{.*\}\}/);
  });

  it.each([
    ["assessment_invite", "Start the assessment"],
    ["interview_slots", "Choose a time"],
    ["interview_confirmed", "Join the meeting"],
    ["offer", "Review your offer"],
  ] as const)("shows the button that %s is sent with", (purpose, label) => {
    expect(preview(purpose).html).toContain(`>${label}</a>`);
  });

  it("is exactly what the real builder produces for the same details", () => {
    const content = defaults("offer");
    const real = offerEmail({
      ...FROM,
      content,
      candidateName: "Alex Johnson",
      jobTitle: "Senior Software Engineer",
      reviewUrl: `${(process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "")}/offer/example-link`,
    });

    expect(preview("offer", content)).toEqual(real);
  });

  it("uses the wording being typed, not the saved one", () => {
    const email = preview("application_received", {
      subject: "Thanks, {{candidate_name}}",
      bodyHtml: "<p>We got it, {{candidate_name}}. Role: {{job_title}}.</p>",
    });

    expect(email.subject).toBe("Thanks, Alex Johnson");
    expect(email.html).toContain("We got it, Alex Johnson. Role: Senior Software Engineer.");
  });

  it("writes dates and times in the company's time zone", () => {
    // 10:00 UTC is 3:30 PM in Colombo.
    expect(preview("interview_confirmed").html).toContain("3:30 PM GMT+5:30 (Asia/Colombo)");
  });

  it("leaves a variable this email does not have as typed, so the mistake is visible", () => {
    const email = preview("offer", { subject: "Offer", bodyHtml: "<p>Start on {{start_date}}</p>" });
    expect(email.html).toContain("{{start_date}}");
  });

  it("still builds while the message is empty", () => {
    const email = preview("offer", { subject: "", bodyHtml: "" });
    expect(email.html).toContain("Review your offer");
  });
});
