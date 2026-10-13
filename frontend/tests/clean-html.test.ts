import { describe, it, expect } from "vitest";
import { cleanRichText } from "@/lib/clean-html";

describe("cleanRichText", () => {
  it("keeps headings, lists and emphasis", () => {
    const html = "<h2>Role</h2><p>We <strong>build</strong> things.</p><ul><li>One</li></ul>";
    expect(cleanRichText(html)).toBe(html);
  });

  it("removes an image with an error handler", () => {
    expect(cleanRichText("<p>Hi</p><img src=x onerror=alert(1)>")).toBe("<p>Hi</p>");
  });

  it("removes scripts, handlers and styles", () => {
    const cleaned = cleanRichText('<p onclick="x()" style="color:red">Hi</p><script>alert(1)</script>');
    expect(cleaned).toBe("<p>Hi</p>");
  });

  it("keeps a web link and drops a javascript one", () => {
    expect(cleanRichText('<a href="https://example.com">Site</a>')).toContain('href="https://example.com"');
    expect(cleanRichText('<a href="javascript:alert(1)">Click</a>')).not.toContain("href");
  });
});
