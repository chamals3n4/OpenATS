import { describe, it, expect } from "vitest";
import {
  mapToAppRole,
  collectRolesFromPayload,
} from "../../src/shared/auth/verify-token";

describe("mapToAppRole", () => {
  it("maps the role names the asgardeo setup script creates", () => {
    expect(mapToAppRole(["super_admin"])).toBe("super_admin");
    expect(mapToAppRole(["hiring manager"])).toBe("hiring_manager");
    expect(mapToAppRole(["Interviewer"])).toBe("interviewer");
  });

  it("maps group paths", () => {
    expect(mapToAppRole(["/Application/openats/super admin"])).toBe(
      "super_admin",
    );
  });

  it("does not match on substrings", () => {
    expect(mapToAppRole(["super_admin_readonly"])).toBeNull();
    expect(mapToAppRole(["ex super admin"])).toBeNull();
  });

  it("returns null when no known role is present", () => {
    expect(mapToAppRole([])).toBeNull();
    expect(mapToAppRole(["everyone"])).toBeNull();
  });

  it("prefers the highest role when several are present", () => {
    expect(mapToAppRole(["interviewer", "super admin"])).toBe("super_admin");
  });
});

describe("collectRolesFromPayload", () => {
  it("reads the roles claim as an array or a string", () => {
    expect(collectRolesFromPayload({ roles: ["a", "b"] })).toEqual(["a", "b"]);
    expect(collectRolesFromPayload({ roles: "a" })).toEqual(["a"]);
  });

  it("splits the comma-separated wso2 claim", () => {
    expect(
      collectRolesFromPayload({ "http://wso2.org/claims/role": "a, b ,c" }),
    ).toEqual(["a", "b", "c"]);
  });

  it("ignores empty and non-string entries", () => {
    expect(collectRolesFromPayload({ roles: ["a", "", 1, null] })).toEqual([
      "a",
    ]);
  });

  it("returns an empty list when the payload has no roles", () => {
    expect(collectRolesFromPayload({})).toEqual([]);
  });
});
