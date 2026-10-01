import { describe, it, expect } from "vitest";
import {
  describeRejectionEmail,
  pickRejectionTemplate,
  sortRejections,
  validateRejection,
} from "@/app/(dashboard)/candidates/[id]/lib/rejection-utils";
import type { CandidateRejection, Template } from "@/types";

const base = { reason: "Lack of required skills", note: "", sendEmail: false, templateId: "" };

describe("validateRejection", () => {
  it("accepts a reason on its own", () => {
    expect(validateRejection(base)).toEqual({});
  });

  it("requires a reason", () => {
    expect(validateRejection({ ...base, reason: "" }).reason).toBeTruthy();
  });

  it("requires a note when the reason is Other", () => {
    expect(validateRejection({ ...base, reason: "Other" }).note).toBeTruthy();
    expect(validateRejection({ ...base, reason: "Other", note: "   " }).note).toBeTruthy();
    expect(validateRejection({ ...base, reason: "Other", note: "Withdrew verbally" })).toEqual({});
  });

  it("requires a template only when an email is being sent", () => {
    expect(validateRejection({ ...base, sendEmail: true }).template).toBeTruthy();
    expect(validateRejection({ ...base, sendEmail: true, templateId: "4" })).toEqual({});
    expect(validateRejection({ ...base, sendEmail: false, templateId: "" })).toEqual({});
  });
});

describe("pickRejectionTemplate", () => {
  const t = (id: number, name: string) => ({ id, name }) as Template;

  it("finds a template that looks like a rejection", () => {
    expect(pickRejectionTemplate([t(1, "Welcome"), t(2, "Application rejected")])?.id).toBe(2);
    expect(pickRejectionTemplate([t(1, "Regret email")])?.id).toBe(1);
  });

  it("returns null when none looks right, so nothing is chosen for you", () => {
    expect(pickRejectionTemplate([t(1, "Welcome"), t(2, "Interview invite")])).toBeNull();
    expect(pickRejectionTemplate([])).toBeNull();
  });
});

describe("sortRejections", () => {
  const r = (id: number, rejectedAt: string) => ({ id, rejectedAt }) as CandidateRejection;

  it("puts the newest first without changing the input", () => {
    const input = [r(1, "2026-09-01T10:00:00Z"), r(2, "2026-09-05T10:00:00Z"), r(3, "2026-09-03T10:00:00Z")];
    expect(sortRejections(input).map((x) => x.id)).toEqual([2, 3, 1]);
    expect(input.map((x) => x.id)).toEqual([1, 2, 3]);
  });
});

describe("describeRejectionEmail", () => {
  it("says what happened with the email", () => {
    expect(describeRejectionEmail({ emailStatus: "sent", sentAt: null }, "Regret")).toEqual({
      tone: "sent",
      label: "Sent using “Regret”",
    });
    expect(describeRejectionEmail({ emailStatus: "sent", sentAt: null }, null).label).toBe("Sent to the candidate");
    expect(describeRejectionEmail({ emailStatus: "not_sent", sentAt: null }, null).tone).toBe("none");
    expect(describeRejectionEmail({ emailStatus: "draft", sentAt: null }, null).tone).toBe("draft");
  });
});
