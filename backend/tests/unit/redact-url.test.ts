import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { redactUrl, tokenFingerprint } from "../../src/utils/redact-url";

describe("redactUrl", () => {
  it("hides the code and state of a sign-in callback", () => {
    expect(redactUrl("/oauth/paraform/callback?code=abc123&state=xyz")).toBe(
      "/oauth/paraform/callback?code=%5Bredacted%5D&state=%5Bredacted%5D",
    );
  });

  it("keeps parameters that are not secret, so the log is still useful", () => {
    expect(redactUrl("/oauth/google/callback?error=access_denied&state=s")).toBe(
      "/oauth/google/callback?error=access_denied&state=%5Bredacted%5D",
    );
  });

  it("matches names whatever their case, and every copy of a repeated one", () => {
    expect(redactUrl("/x?Token=a&token=b")).not.toMatch(/=a|=b/);
  });

  it("leaves a URL without secrets exactly as it was", () => {
    expect(redactUrl("/api/candidates?page=2&search=a%20b")).toBe("/api/candidates?page=2&search=a%20b");
    expect(redactUrl("/health")).toBe("/health");
  });
});

describe("redactUrl on candidate links", () => {
  it.each([
    ["/public/offers/abc123", "/public/offers/[redacted]"],
    ["/public/offers/abc123/accept", "/public/offers/[redacted]/accept"],
    ["/public/assessment/abc123/answer", "/public/assessment/[redacted]/answer"],
    ["/public/assignment/abc123/submit", "/public/assignment/[redacted]/submit"],
    ["/public/interview/abc123?slot=4", "/public/interview/[redacted]?slot=4"],
  ])("hides the token in %s", (url, expected) => {
    expect(redactUrl(url)).toBe(expected);
  });

  it("leaves other public paths alone", () => {
    expect(redactUrl("/public/jobs/42/apply")).toBe("/public/jobs/42/apply");
  });

  // A new public route with a token in its path must be added to TOKEN_PATH in redact-url.ts.
  it("covers every route in public.routes.ts that takes a token", () => {
    const source = readFileSync(path.join(__dirname, "../../src/routes/public.routes.ts"), "utf8");
    const routes = [...source.matchAll(/"(\/[^"]*:token[^"]*)"/g)].map((m) => m[1]!);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const logged = redactUrl(`/public${route.replace(":token", "SECRET-TOKEN")}`);
      expect(logged, route).not.toContain("SECRET-TOKEN");
    }
  });
});

describe("tokenFingerprint", () => {
  it("is short, stable, and not the token", () => {
    const label = tokenFingerprint("abc123");
    expect(label).toMatch(/^[0-9a-f]{8}$/);
    expect(tokenFingerprint("abc123")).toBe(label);
    expect(label).not.toContain("abc123");
  });

  it("says none when there is no token", () => {
    expect(tokenFingerprint(undefined)).toBe("none");
  });
});
