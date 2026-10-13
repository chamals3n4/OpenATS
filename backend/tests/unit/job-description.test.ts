import { describe, it, expect } from "vitest";
import { sanitizeJobDescription } from "../../src/modules/job/job-description";

describe("sanitizeJobDescription", () => {
  it("keeps what the editor produces", () => {
    const html =
      "<h1>Engineer</h1><h2>About</h2><p>We <strong>build</strong> <em>things</em>.</p>" +
      "<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol><blockquote>Quote</blockquote><hr>";
    expect(sanitizeJobDescription(html)).toBe(html.replace("<hr>", "<hr />"));
  });

  it("removes an event handler and the image carrying it", () => {
    expect(sanitizeJobDescription("<p>Hi</p><img src=x onerror=alert(1)>")).toBe("<p>Hi</p>");
  });

  it("removes event handlers from tags that are allowed", () => {
    expect(sanitizeJobDescription('<p onclick="steal()" style="color:red">Hi</p>')).toBe("<p>Hi</p>");
  });

  it("removes a script and what is inside it", () => {
    expect(sanitizeJobDescription("<p>Hi</p><script>fetch('/api/users')</script>")).toBe("<p>Hi</p>");
  });

  it.each([
    ["an iframe", '<iframe src="https://evil.example"></iframe>'],
    ["a form", '<form action="https://evil.example"><input name="password"></form>'],
    ["an svg with a handler", "<svg onload=alert(1)></svg>"],
    ["a style block", "<style>body{display:none}</style>"],
    ["an object", '<object data="x"></object>'],
  ])("removes %s", (_name, html) => {
    expect(sanitizeJobDescription(`<p>Hi</p>${html}`)).toBe("<p>Hi</p>");
  });

  it("keeps the text of a tag it removes", () => {
    expect(sanitizeJobDescription("<div><span>Plain words</span></div>")).toBe("Plain words");
  });

  describe("links", () => {
    it("keeps http, https and mailto links, opened safely in a new tab", () => {
      expect(sanitizeJobDescription('<a href="https://example.com/jobs">Site</a>')).toBe(
        '<a href="https://example.com/jobs" target="_blank" rel="noopener noreferrer nofollow">Site</a>',
      );
      expect(sanitizeJobDescription('<a href="mailto:hr@example.com">Mail</a>')).toContain('href="mailto:hr@example.com"');
    });

    it.each([
      ["javascript:", "javascript:alert(1)"],
      ["javascript: in mixed case with spaces", " JaVaScRiPt:alert(1)"],
      ["data:", "data:text/html,<script>alert(1)</script>"],
      ["vbscript:", "vbscript:msgbox(1)"],
      ["a protocol-relative address", "//evil.example/x"],
    ])("drops a %s link target and keeps the words", (_name, href) => {
      const cleaned = sanitizeJobDescription(`<a href="${href}">Click</a>`);
      expect(cleaned).not.toContain("href=");
      expect(cleaned).toContain("Click");
    });

    it("cannot be given its own rel or target", () => {
      const cleaned = sanitizeJobDescription('<a href="https://example.com" rel="opener" target="_self">x</a>');
      expect(cleaned).toContain('rel="noopener noreferrer nofollow"');
      expect(cleaned).toContain('target="_blank"');
      expect(cleaned).not.toContain("_self");
    });
  });

  it("gives the same result when run again", () => {
    const once = sanitizeJobDescription('<p>Hi <a href="https://example.com">there</a></p><img src=x onerror=alert(1)>');
    expect(sanitizeJobDescription(once)).toBe(once);
  });

  it("passes null and undefined through", () => {
    expect(sanitizeJobDescription(null)).toBeNull();
    expect(sanitizeJobDescription(undefined)).toBeUndefined();
    expect(sanitizeJobDescription("")).toBe("");
  });
});
