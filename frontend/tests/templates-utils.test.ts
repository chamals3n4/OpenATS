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

import { isPastSlot, validateTemplateForm } from "@/app/(dashboard)/templates/lib/template-form-utils";

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

describe("isPastSlot", () => {
  const now = new Date("2026-10-11T12:00").getTime();
  it("is true only for a chosen time that has passed", () => {
    expect(isPastSlot("2026-10-11T11:59", now)).toBe(true);
    expect(isPastSlot("2026-10-11T12:01", now)).toBe(false);
    expect(isPastSlot("", now)).toBe(false);
  });
});
