import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { logUrl, tokenFingerprint } from "../../src/utils/log-url";

const TOKEN = "f3a9c1d2e4b5a6978877665544332211";

describe("logUrl", () => {
  it.each([
    ["/public/assessment/T", "/public/assessment/[redacted]"],
    ["/public/assessment/T/start", "/public/assessment/[redacted]/start"],
    ["/public/assessment/T/answer", "/public/assessment/[redacted]/answer"],
    ["/public/assignment/T/submit", "/public/assignment/[redacted]/submit"],
    ["/public/offers/T/accept", "/public/offers/[redacted]/accept"],
    ["/public/interview/T/select?slot=3", "/public/interview/[redacted]/select?slot=3"],
  ])("takes the token out of %s", (url, expected) => {
    const logged = logUrl(url.replace("T", TOKEN));
    expect(logged).toBe(expected);
    expect(logged).not.toContain(TOKEN);
  });

  it("leaves other addresses alone", () => {
    expect(logUrl("/public/jobs/42/apply")).toBe("/public/jobs/42/apply");
    expect(logUrl("/api/candidates/7?search=ana")).toBe("/api/candidates/7?search=ana");
  });

  // A new candidate link added to the public routes must be covered here too.
  it("covers every :token route in public.routes.ts", () => {
    const source = readFileSync(path.join(__dirname, "../../src/routes/public.routes.ts"), "utf8");
    const routes = [...source.matchAll(/"(\/[\w-]+\/:token[^"]*)"/g)].map((m) => m[1] ?? "");
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const url = `/public${route.replace(":token", TOKEN)}`;
      expect(logUrl(url), route).not.toContain(TOKEN);
    }
  });
});

describe("tokenFingerprint", () => {
  it("is short, stable and does not contain the token", () => {
    const fingerprint = tokenFingerprint(TOKEN);
    expect(fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(tokenFingerprint(TOKEN)).toBe(fingerprint);
    expect(TOKEN).not.toContain(fingerprint);
  });

  it("handles a missing token", () => {
    expect(tokenFingerprint(undefined)).toBe("none");
  });
});
