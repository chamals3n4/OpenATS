import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// The auth_* tables hold password hashes, session tokens and signing keys.
// They belong to Better Auth in the Next.js server; Express only verifies
// JWTs and must never read them, so nothing here can leak them in a response.

const SRC = join(__dirname, "../../src");
const SCHEMA_DIR = join("db", "schema") + sep;
const AUTH_TABLES =
  /\b(authSessions|authAccounts|authVerifications|authJwks|authRateLimits)\b|\bauth_(sessions|accounts|verifications|jwks|rate_limits)\b|schema\/auth["']/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".ts") ? [path] : [];
  });
}

describe("auth tables", () => {
  it("are not referenced by any backend code outside the schema", () => {
    const offenders = sourceFiles(SRC)
      .map((path) => relative(SRC, path))
      .filter((path) => !path.startsWith(SCHEMA_DIR))
      .filter((path) => AUTH_TABLES.test(readFileSync(join(SRC, path), "utf8")));

    expect(offenders).toEqual([]);
  });
});
