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
