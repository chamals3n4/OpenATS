import { describe, it, expect } from "vitest";
import {
  formatMemberSince,
  fullNameOf,
  humanizeRole,
  initialsOf,
} from "@/app/(dashboard)/settings/profile/lib/profile-utils";

describe("humanizeRole", () => {
  it("names the app's roles properly", () => {
    expect(humanizeRole("super_admin")).toBe("Super admin");
    expect(humanizeRole("hiring_manager")).toBe("Hiring manager");
    expect(humanizeRole("interviewer")).toBe("Interviewer");
  });

  it("tidies a role it does not know instead of showing it raw", () => {
    expect(humanizeRole("talent_partner")).toBe("Talent partner");
    expect(humanizeRole("OFFICE-ADMIN")).toBe("Office admin");
    expect(humanizeRole("")).toBe("");
  });
});

describe("initialsOf", () => {
  it("uses first and last initials, in capitals", () => {
    expect(initialsOf("chamal", "senarathna")).toBe("CS");
  });

  it("copes with a missing last name, and with nothing at all", () => {
    expect(initialsOf("Chamal", null)).toBe("C");
    expect(initialsOf(null, null, "chamals004")).toBe("C");
    expect(initialsOf("", "", "")).toBe("?");
  });
});

describe("formatMemberSince", () => {
  it("shows the month and year", () => {
    expect(formatMemberSince("2026-09-09T09:00:00Z")).toBe("September 2026");
  });

  it("is null for a missing or unreadable date", () => {
    expect(formatMemberSince(null)).toBeNull();
    expect(formatMemberSince("garbage")).toBeNull();
  });
});

describe("fullNameOf", () => {
  it("joins the first and last name", () => {
    expect(fullNameOf("Chamal", "Senarathna")).toBe("Chamal Senarathna");
    expect(fullNameOf(" Chamal ", null)).toBe("Chamal");
  });

  it("falls back when there is no name at all", () => {
    expect(fullNameOf(null, "", "chamal@example.com")).toBe("chamal@example.com");
    expect(fullNameOf(null, null)).toBe("User");
  });
});
