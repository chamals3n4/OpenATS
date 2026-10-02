import { describe, it, expect } from "vitest";
import {
  formatMemberSince,
  humanizeRole,
  identityFromClaims,
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

describe("identityFromClaims", () => {
  it("reads the name, email, username and country", () => {
    const id = identityFromClaims({
      given_name: "Chamal",
      family_name: "Senarathna",
      email: "chamal@example.com",
      username: "chamals",
      address: { country: "Sri Lanka" },
      roles: ["hiring_manager"],
    });
    expect(id).toMatchObject({
      firstName: "Chamal",
      lastName: "Senarathna",
      fullName: "Chamal Senarathna",
      email: "chamal@example.com",
      username: "chamals",
      country: "Sri Lanka",
      roles: ["hiring_manager"],
    });
  });

  it("falls back to the username, then the subject, when there is no name", () => {
    expect(identityFromClaims({ username: "chamals" }).fullName).toBe("chamals");
    expect(identityFromClaims({ sub: "abc-123" }).fullName).toBe("abc-123");
    expect(identityFromClaims({}).fullName).toBe("User");
  });

  it("treats blank claims as missing, and ignores a roles claim that is not a list of strings", () => {
    const id = identityFromClaims({ address: { country: "  " }, profile: "", roles: "admin" });
    expect(id.country).toBeNull();
    expect(id.avatarUrl).toBeNull();
    expect(id.roles).toEqual([]);
  });
});
