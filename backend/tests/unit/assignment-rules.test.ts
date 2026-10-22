import { describe, expect, it } from "vitest";
import {
  dueDateFor,
  isOpenForSubmission,
  checkAnswers,
  fieldsSchema,
  resourceSchema,
} from "../../src/modules/assignment/assignment-rules";

const form = [
  { id: "repo", label: "Repository", type: "link" as const, required: true },
  { id: "demo", label: "Live demo", type: "link" as const, required: false },
  { id: "why", label: "Your approach", type: "long_text" as const, required: false },
  { id: "hours", label: "Hours spent", type: "short_text" as const, required: true },
];

describe("checkAnswers", () => {
  const ok = { repo: "https://github.com/a/b", hours: "6" };

  it("keeps trimmed answers and leaves out empty optional ones", () => {
    const result = checkAnswers(form, { ...ok, repo: "  https://github.com/a/b ", demo: "   ", why: "TDD" });
    expect(result).toEqual({ ok: true, answers: { repo: "https://github.com/a/b", hours: "6", why: "TDD" } });
  });

  it("drops answers to fields that are not on the form", () => {
    const result = checkAnswers(form, { ...ok, extra: "x" });
    expect(result.ok && "extra" in result.answers).toBe(false);
  });

  it("names the required field that is missing", () => {
    expect(checkAnswers(form, { repo: "https://github.com/a/b" })).toEqual({ ok: false, error: "Hours spent is required" });
    expect(checkAnswers(form, { ...ok, hours: "  " }).ok).toBe(false);
  });

  it("refuses a link that is not a web address", () => {
    for (const link of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com", "not a url"]) {
      expect(checkAnswers(form, { ...ok, repo: link }).ok).toBe(false);
    }
  });

  it("refuses an answer that is too long", () => {
    expect(checkAnswers(form, { ...ok, hours: "x".repeat(501) }).ok).toBe(false);
  });
});

describe("fieldsSchema", () => {
  it("needs at least one field, with a label", () => {
    expect(fieldsSchema.safeParse([]).success).toBe(false);
    expect(fieldsSchema.safeParse([{ ...form[0], label: " " }]).success).toBe(false);
    expect(fieldsSchema.safeParse(form).success).toBe(true);
  });

  it("refuses repeated ids and more than ten fields", () => {
    expect(fieldsSchema.safeParse([form[0], form[0]]).success).toBe(false);
    const many = Array.from({ length: 11 }, (_, i) => ({ ...form[0]!, id: `f${i}` }));
    expect(fieldsSchema.safeParse(many).success).toBe(false);
  });
});

describe("resourceSchema", () => {
  it("needs a name and a web address", () => {
    expect(resourceSchema.safeParse({ label: "Spec", url: "https://example.com/spec.pdf" }).success).toBe(true);
    expect(resourceSchema.safeParse({ label: "", url: "https://example.com" }).success).toBe(false);
    expect(resourceSchema.safeParse({ label: "Spec", url: "javascript:1" }).success).toBe(false);
  });
});

describe("isOpenForSubmission", () => {
  const dueAt = new Date("2026-01-10T12:00:00Z");

  it("is open until the deadline for a first hand-in", () => {
    expect(isOpenForSubmission("pending", dueAt, new Date("2026-01-10T11:59:59Z"))).toBe(true);
  });

  it("is closed once handed in, so work cannot be changed", () => {
    expect(isOpenForSubmission("submitted", dueAt, new Date("2026-01-10T11:59:59Z"))).toBe(false);
  });

  it("is closed after the deadline", () => {
    expect(isOpenForSubmission("pending", dueAt, new Date("2026-01-10T12:00:01Z"))).toBe(false);
    expect(isOpenForSubmission("submitted", dueAt, new Date("2026-01-11T00:00:00Z"))).toBe(false);
  });

  it("is closed once expired", () => {
    expect(isOpenForSubmission("expired", dueAt, new Date("2026-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("dueDateFor", () => {
  it("adds whole days", () => {
    const due = dueDateFor(new Date("2026-01-01T09:00:00Z"), 7);
    expect(due.toISOString().slice(0, 10)).toBe("2026-01-08");
  });
});
