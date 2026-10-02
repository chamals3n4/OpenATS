import { describe, it, expect } from "vitest";
import {
  cleanSubject,
  formatReplyTo,
  plainTextToEmailHtml,
  resolveReplyTo,
} from "../../src/modules/candidate-email/candidate-email.service";

describe("plainTextToEmailHtml", () => {
  it("escapes markup so typed text can never become HTML", () => {
    const html = plainTextToEmailHtml('<script>alert("x")</script> & <img src=x onerror=alert(1)>');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("makes a paragraph for each blank-line-separated block", () => {
    const html = plainTextToEmailHtml("Hi Sam,\n\nThanks for applying.\n\nBest,\nTeam");
    expect(html.match(/<p /g)).toHaveLength(3);
  });

  it("keeps single line breaks inside a paragraph", () => {
    const html = plainTextToEmailHtml("Best,\nThe team");
    expect(html).toContain("Best,<br>The team");
    expect(html.match(/<p /g)).toHaveLength(1);
  });

  it("normalises Windows line endings and ignores surrounding blank space", () => {
    const html = plainTextToEmailHtml("\r\n\r\nHello\r\n\r\nWorld\r\n");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).not.toContain("\r");
  });
});

describe("cleanSubject", () => {
  it("keeps the subject on one line, so a pasted newline cannot add extra headers", () => {
    expect(cleanSubject("Interview\r\nBcc: someone@example.com")).toBe(
      "Interview Bcc: someone@example.com",
    );
  });

  it("trims", () => {
    expect(cleanSubject("  Hello  ")).toBe("Hello");
  });
});

describe("formatReplyTo", () => {
  it("shows the sender's name with their address", () => {
    expect(formatReplyTo("Chamal Senarathna", "chamal@example.com")).toBe(
      "Chamal Senarathna <chamal@example.com>",
    );
  });

  it("falls back to just the address when there is no name", () => {
    expect(formatReplyTo("", "chamal@example.com")).toBe("chamal@example.com");
    expect(formatReplyTo(null, "chamal@example.com")).toBe("chamal@example.com");
    expect(formatReplyTo("  ", "chamal@example.com")).toBe("chamal@example.com");
  });

  it("cannot be used to end the name early or add a header", () => {
    const header = formatReplyTo('Eve" <evil@x.com>\r\nBcc: spy@x.com', "chamal@example.com");
    expect(header).not.toContain("\n");
    expect(header).not.toContain("\r");
    expect(header.match(/</g)).toHaveLength(1);
    expect(header.endsWith("<chamal@example.com>")).toBe(true);
  });
});

describe("resolveReplyTo", () => {
  const sender = { firstName: "Chamal", lastName: "Senarathna", email: "chamal@example.com" };

  it("defaults to the sender, with their name", () => {
    expect(resolveReplyTo(sender)).toBe("Chamal Senarathna <chamal@example.com>");
    expect(resolveReplyTo(sender, "")).toBe("Chamal Senarathna <chamal@example.com>");
  });

  it("uses a chosen address as given, without borrowing the sender's name", () => {
    expect(resolveReplyTo(sender, "hr@example.com")).toBe("hr@example.com");
  });

  it("treats the sender's own address as the default, whatever its case", () => {
    expect(resolveReplyTo(sender, "CHAMAL@example.com")).toBe("Chamal Senarathna <chamal@example.com>");
  });

  it("still honours a chosen address when the sender record is missing", () => {
    expect(resolveReplyTo(undefined, "hr@example.com")).toBe("hr@example.com");
    expect(resolveReplyTo(undefined)).toBeUndefined();
  });
});
