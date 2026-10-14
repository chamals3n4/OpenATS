import { describe, it, expect } from "vitest";
import {
  BODY_MAX,
  SUBJECT_MAX,
  chosenReplyTo,
  htmlToPlainText,
  isValidReplyAddress,
  splitParagraphs,
  validateEmail,
} from "@/app/(dashboard)/candidates/[id]/_lib/email-utils";

describe("validateEmail", () => {
  it("accepts a subject and a message", () => {
    expect(validateEmail({ subject: "Hello", body: "Hi there" })).toEqual({});
  });

  it("asks for what is missing, treating blank space as nothing", () => {
    expect(validateEmail({ subject: "  ", body: "\n\n" })).toEqual({
      subject: "Add a subject.",
      body: "Write a message.",
    });
  });

  it("enforces the same limits as the server", () => {
    expect(validateEmail({ subject: "x".repeat(SUBJECT_MAX + 1), body: "ok" }).subject).toMatch(/under 200/);
    expect(validateEmail({ subject: "ok", body: "x".repeat(BODY_MAX + 1) }).body).toMatch(/under 10,000/);
    expect(validateEmail({ subject: "x".repeat(SUBJECT_MAX), body: "x".repeat(BODY_MAX) })).toEqual({});
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines and keeps single line breaks", () => {
    expect(splitParagraphs("Hi Sam,\n\nThanks.\n\nBest,\nTeam")).toEqual([
      ["Hi Sam,"],
      ["Thanks."],
      ["Best,", "Team"],
    ]);
  });

  it("copes with Windows line endings and surrounding space, and is empty for nothing", () => {
    expect(splitParagraphs("\r\nHello\r\n\r\nWorld\r\n")).toEqual([["Hello"], ["World"]]);
    expect(splitParagraphs("   ")).toEqual([]);
  });
});

describe("htmlToPlainText", () => {
  it("reads the text and ignores markup, including script", () => {
    const text = htmlToPlainText("<div><p>Hello <b>Sam</b></p><p>Bye</p><script>window.x=1</script></div>");
    expect(text).toContain("Hello Sam");
    expect(text).toContain("Bye");
    expect(text).not.toContain("window.x");
    expect(text).toBe("Hello Sam Bye");
    expect((window as unknown as { x?: number }).x).toBeUndefined();
  });
});

describe("reply address", () => {
  it("accepts one plain address only", () => {
    expect(isValidReplyAddress("hr@yourcompany.com")).toBe(true);
    expect(isValidReplyAddress("  hr@yourcompany.com  ")).toBe(true);
    expect(isValidReplyAddress("a@b.co, c@d.com")).toBe(false);
    expect(isValidReplyAddress("Eve <e@x.com>")).toBe(false);
    expect(isValidReplyAddress("hr@company")).toBe(false);
    expect(isValidReplyAddress("two words@x.com")).toBe(false);
  });

  it("only reports a problem when something was typed", () => {
    expect(validateEmail({ subject: "s", body: "b", replyTo: "" })).toEqual({});
    expect(validateEmail({ subject: "s", body: "b", replyTo: "nope" }).replyTo).toMatch(/single email address/);
  });

  it("sends a reply-to only when it differs from the sender's own address", () => {
    expect(chosenReplyTo("", "me@x.com")).toBeUndefined();
    expect(chosenReplyTo("  ", "me@x.com")).toBeUndefined();
    expect(chosenReplyTo("ME@x.com", "me@x.com")).toBeUndefined();
    expect(chosenReplyTo(" hr@x.com ", "me@x.com")).toBe("hr@x.com");
  });
});

import {
  fillTemplateText,
  templateHtmlToText,
  unfilledVariables,
  validateEmail as validate,
} from "@/app/(dashboard)/candidates/[id]/_lib/email-utils";

describe("using a template in a typed email", () => {
  it("turns template HTML into paragraphs of plain text", () => {
    expect(templateHtmlToText("<p>Hello</p><p>Line one<br>Line two</p><script>alert(1)</script>")).toBe(
      "Hello\n\nLine one\nLine two",
    );
  });

  it("keeps a button's label, with its link when it is a real one", () => {
    expect(templateHtmlToText('<div><a data-email-button href="https://x.example/y">Open</a></div>')).toBe(
      "Open: https://x.example/y",
    );
    expect(templateHtmlToText('<div><a data-email-button href="[url]">Open</a></div>')).toBe("Open");
  });

  it("fills what it knows and leaves the rest in place", () => {
    expect(fillTemplateText("{{ candidate_name }} / {{salary}} / {{job_title}}", { candidate_name: "Ada", job_title: null })).toBe(
      "Ada / {{salary}} / {{job_title}}",
    );
  });

  it("refuses to send text that still has a variable in it", () => {
    expect(unfilledVariables("Hi {{a}} and {{ a }} and {{b}}")).toEqual(["{{a}}", "{{b}}"]);
    expect(validate({ subject: "About {{job_title}}", body: "Hello" }).subject).toMatch(/Replace \{\{job_title\}\}/);
    expect(validate({ subject: "Hi", body: "Hello" })).toEqual({});
  });
});
