import { describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("checkEnv", () => {
  it("passes a complete environment", () => {
    expect(checkEnv(valid)).toEqual([]);
  });

  it("requires DATABASE_URL", () => {
    const issues = checkEnv({ ...valid, DATABASE_URL: "" });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("DATABASE_URL");
  });

  it("requires BETTER_AUTH_SECRET", () => {
    const issues = checkEnv({ ...valid, BETTER_AUTH_SECRET: undefined });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("BETTER_AUTH_SECRET is required");
  });

  it("rejects a secret shorter than 32 characters", () => {
    const issues = checkEnv({ ...valid, BETTER_AUTH_SECRET: "a".repeat(31) });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("at least 32 characters");
  });

  it("never prints the secret", () => {
    const secret = "short-secret-value";
    const issues = checkEnv({ ...valid, BETTER_AUTH_SECRET: secret });
    expect(issues.join("\n")).not.toContain(secret);
  });

  it("requires BETTER_AUTH_URL to be a URL", () => {
    expect(checkEnv({ ...valid, BETTER_AUTH_URL: "" })[0]).toContain(
      "BETTER_AUTH_URL is required",
    );
    expect(checkEnv({ ...valid, BETTER_AUTH_URL: "localhost" })[0]).toContain(
      "valid URL",
    );
  });

  it("reports every problem at once", () => {
    expect(checkEnv({})).toHaveLength(3);
  });
});
