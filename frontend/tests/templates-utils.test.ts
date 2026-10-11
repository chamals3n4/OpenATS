import { describe, it, expect } from "vitest";
import {
  TEMPLATE_NAME_MAX,
  suggestCopyName,
  validateTemplateName,
} from "@/app/(dashboard)/templates/lib/templates-utils";

describe("suggestCopyName", () => {
  it("adds (copy) to the name", () => {
    expect(suggestCopyName("Offer letter")).toBe("Offer letter (copy)");
    expect(suggestCopyName("  Offer letter  ")).toBe("Offer letter (copy)");
  });

  it("stays within the name limit even for a name that is already near it", () => {
    const suggestion = suggestCopyName("x".repeat(TEMPLATE_NAME_MAX));
    expect(suggestion.length).toBeLessThanOrEqual(TEMPLATE_NAME_MAX);
    expect(suggestion.endsWith(" (copy)")).toBe(true);
  });
});

describe("validateTemplateName", () => {
  it("accepts a normal name, trimming blank space", () => {
    expect(validateTemplateName("Offer letter (copy)")).toBeNull();
    expect(validateTemplateName("  ok  ")).toBeNull();
  });

  it("asks for a name when there is none", () => {
    expect(validateTemplateName("")).toBeTruthy();
    expect(validateTemplateName("   ")).toBeTruthy();
  });

  it("enforces the same limit as the server", () => {
    expect(validateTemplateName("x".repeat(TEMPLATE_NAME_MAX))).toBeNull();
    expect(validateTemplateName("x".repeat(TEMPLATE_NAME_MAX + 1))).toMatch(/under 255/);
  });
});

import { buildEventPayload, formatDuration, validateTemplateForm } from "@/app/(dashboard)/templates/lib/template-form-utils";

describe("validateTemplateForm", () => {
  it("needs a name for both kinds of template", () => {
    expect(validateTemplateForm({ type: "event", name: "  ", subject: "" })).toEqual({ name: "Enter a name." });
    expect(validateTemplateForm({ type: "event", name: "Round 1", subject: "" })).toEqual({});
  });

  it("needs a subject for an email only", () => {
    expect(validateTemplateForm({ type: "email", name: "Offer", subject: " " })).toEqual({
      subject: "Enter a subject.",
    });
    expect(validateTemplateForm({ type: "email", name: "Offer", subject: "Your offer" })).toEqual({});
  });

  it("rejects text longer than the API accepts", () => {
    const errors = validateTemplateForm({ type: "email", name: "a".repeat(256), subject: "b".repeat(501) });
    expect(errors.name).toMatch(/255/);
    expect(errors.subject).toMatch(/500/);
  });
});

describe("buildEventPayload", () => {
  const base = {
    eventName: "Round 1",
    description: "",
    durationMinutes: 45,
    message: "  See you soon.  ",
    meetingUrl: "https://zoom.example/1",
    location: "12 Park Street",
  };
  const saved = (config: Parameters<typeof buildEventPayload>[0]) =>
    JSON.parse((buildEventPayload(config) as { content: string }[])[0]!.content);

  it("saves the length and the message, and no dates", () => {
    const config = saved({ ...base, eventType: "virtual", autoGenerateMeet: false });
    expect(config).toMatchObject({ durationMinutes: 45, message: "See you soon." });
    expect(config).not.toHaveProperty("timeSlots");
  });

  it("keeps only the place that fits the interview type", () => {
    expect(saved({ ...base, eventType: "virtual", autoGenerateMeet: false })).toMatchObject({
      meetingUrl: "https://zoom.example/1",
      location: null,
    });
    expect(saved({ ...base, eventType: "virtual", autoGenerateMeet: true })).toMatchObject({
      meetingUrl: null,
      autoGenerateMeet: true,
    });
    expect(saved({ ...base, eventType: "onsite", autoGenerateMeet: true })).toMatchObject({
      meetingUrl: null,
      autoGenerateMeet: false,
      location: "12 Park Street",
    });
  });
});

describe("formatDuration", () => {
  it("reads naturally", () => {
    expect(formatDuration(45)).toBe("45 minutes");
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(90)).toBe("1.5 hours");
  });
});

import { renderPreviewHtml } from "@/app/(dashboard)/templates/lib/template-form-utils";

describe("renderPreviewHtml", () => {
  it("removes scripts and event handlers, and keeps ordinary formatting", () => {
    const html = renderPreviewHtml(
      '<p onclick="alert(1)">Hi <strong>there</strong></p><script>alert(2)</script><img src=x onerror="alert(3)"><a href="javascript:alert(4)">x</a>',
    );
    expect(html).toContain("<strong>there</strong>");
    expect(html).not.toMatch(/script|onclick|onerror|javascript:/i);
  });

  it("fills in sample values, escaped", () => {
    const html = renderPreviewHtml("<p>Hello {{candidate_name}}</p>", { candidate_name: "<b>Ada</b>" });
    expect(html).toContain("&lt;b&gt;Ada&lt;/b&gt;");
    expect(html).not.toContain("<b>Ada</b>");
  });
});
