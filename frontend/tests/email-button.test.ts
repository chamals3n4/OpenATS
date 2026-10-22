import { describe, expect, it } from "vitest";
import { isUsableButtonLink } from "@/app/(dashboard)/templates/_components/template-form/email-builder/extensions/button-style";

describe("isUsableButtonLink", () => {
  it("takes a web or mail address, or a link variable", () => {
    expect(isUsableButtonLink("https://careers.example.com/jobs")).toBe(true);
    expect(isUsableButtonLink("mailto:jobs@example.com")).toBe(true);
    expect(isUsableButtonLink("{{offer_review_url}}")).toBe(true);
  });

  it("refuses what would not open anything, or something unsafe", () => {
    expect(isUsableButtonLink("")).toBe(false);
    expect(isUsableButtonLink("[url]")).toBe(false);
    expect(isUsableButtonLink("example.com")).toBe(false);
    expect(isUsableButtonLink("javascript:alert(1)")).toBe(false);
  });
});
