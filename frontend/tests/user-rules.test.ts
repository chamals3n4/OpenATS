import { describe, expect, it } from "vitest";
import {
  isValidPassword,
  lockoutReason,
  parseCreateUser,
  parseUpdateUser,
} from "@/lib/user-rules";

const ADMIN = { id: 1, role: "super_admin" };
const OTHER_ADMIN = { id: 2, role: "super_admin" };
const MANAGER = { id: 3, role: "hiring_manager" };

describe("lockoutReason", () => {
  it("stops a super admin deactivating themselves", () => {
    expect(
      lockoutReason({
        actorId: 1,
        target: ADMIN,
        activeSuperAdminIds: [1, 2],
        change: "deactivate",
      }),
    ).toBe("You cannot deactivate your own account.");
  });

  it("stops a super admin demoting themselves", () => {
    expect(
      lockoutReason({
        actorId: 1,
        target: ADMIN,
        activeSuperAdminIds: [1, 2],
        change: "hiring_manager",
      }),
    ).toBe("You cannot change your own role.");
  });

  it("stops the last active super admin being deactivated or demoted", () => {
    for (const change of ["deactivate", "interviewer"] as const) {
      expect(
        lockoutReason({
          actorId: 9,
          target: ADMIN,
          activeSuperAdminIds: [1],
          change,
        }),
      ).toMatch(/last active super admin/);
    }
  });

  it("allows another super admin to be deactivated or demoted when one remains", () => {
    for (const change of ["deactivate", "interviewer"] as const) {
      expect(
        lockoutReason({
          actorId: 1,
          target: OTHER_ADMIN,
          activeSuperAdminIds: [1, 2],
          change,
        }),
      ).toBeNull();
    }
  });

  it("allows other users to be deactivated, promoted and demoted", () => {
    for (const change of ["deactivate", "super_admin", "interviewer"] as const) {
      expect(
        lockoutReason({
          actorId: 1,
          target: MANAGER,
          activeSuperAdminIds: [1],
          change,
        }),
      ).toBeNull();
    }
  });

  it("allows saving a super admin with the role unchanged", () => {
    expect(
      lockoutReason({
        actorId: 1,
        target: ADMIN,
        activeSuperAdminIds: [1],
        change: "super_admin",
      }),
    ).toBeNull();
  });
});

describe("parseCreateUser", () => {
  const base = { email: " Ada@Example.com ", firstName: " Ada ", lastName: "L" };

  it("accepts an invite and normalises the email", () => {
    expect(parseCreateUser({ ...base, method: "invite" })).toEqual({
      ok: true,
      value: {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "L",
        role: "interviewer",
        method: "invite",
      },
    });
  });

  it("drops a password sent with an invite", () => {
    const parsed = parseCreateUser({
      ...base,
      method: "invite",
      password: "should-be-ignored",
    });
    expect(parsed.ok && parsed.value.password).toBeUndefined();
  });

  it("requires a password of 8 to 128 characters for the set method", () => {
    expect(parseCreateUser({ ...base, method: "set" }).ok).toBe(false);
    expect(parseCreateUser({ ...base, method: "set", password: "short" }).ok).toBe(
      false,
    );
    expect(
      parseCreateUser({ ...base, method: "set", password: "a".repeat(129) }).ok,
    ).toBe(false);
    expect(
      parseCreateUser({ ...base, method: "set", password: "long-enough" }).ok,
    ).toBe(true);
  });

  it("rejects a bad email, a missing first name, an unknown role or method", () => {
    expect(parseCreateUser({ ...base, email: "nope", method: "invite" }).ok).toBe(
      false,
    );
    expect(parseCreateUser({ ...base, firstName: " ", method: "invite" }).ok).toBe(
      false,
    );
    expect(parseCreateUser({ ...base, role: "owner", method: "invite" }).ok).toBe(
      false,
    );
    expect(parseCreateUser({ ...base, method: "magic" }).ok).toBe(false);
    expect(parseCreateUser(null).ok).toBe(false);
  });
});

describe("parseUpdateUser", () => {
  it("keeps only the fields that were sent", () => {
    expect(parseUpdateUser({ role: "hiring_manager" })).toEqual({
      ok: true,
      value: { role: "hiring_manager" },
    });
  });

  it("ignores fields it does not know, such as isActive or banned", () => {
    const parsed = parseUpdateUser({
      firstName: "Ada",
      isActive: false,
      banned: true,
      oldRole: "super_admin",
    });
    expect(parsed).toEqual({ ok: true, value: { firstName: "Ada" } });
  });

  it("rejects an empty first name, a bad email and an unknown role", () => {
    expect(parseUpdateUser({ firstName: "" }).ok).toBe(false);
    expect(parseUpdateUser({ email: "nope" }).ok).toBe(false);
    expect(parseUpdateUser({ role: "owner" }).ok).toBe(false);
  });
});

describe("isValidPassword", () => {
  it("accepts 8 to 128 characters with no other rule", () => {
    expect(isValidPassword("a".repeat(8))).toBe(true);
    expect(isValidPassword("a".repeat(128))).toBe(true);
    expect(isValidPassword("a".repeat(7))).toBe(false);
    expect(isValidPassword("a".repeat(129))).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
  });
});
