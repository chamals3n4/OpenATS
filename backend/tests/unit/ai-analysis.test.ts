import { afterEach, describe, expect, it } from "vitest";
import { envSchema } from "../../src/config/env";
import { toAiSummary } from "../../src/modules/candidate/cv-analysis.service";
import { aiSettingsService } from "../../src/modules/settings/ai-settings.service";

const originalKey = process.env.GEMINI_API_KEY;
afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
});

describe("the Gemini key is optional", () => {
  // A complete environment written out here, so the test does not depend on whatever the machine
  // running it happens to have set (CI has only the few values in .env.test).
  const requiredEnv = {
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    AUTH_JWKS_URL: "https://example.test/jwks",
    AUTH_ISSUER: "https://example.test/issuer",
    ENCRYPTION_KEY: "key",
    FRONTEND_URL: "http://localhost:3000",
    R2_ENDPOINT: "https://r2.example.test",
    R2_ACCESS_KEY_ID: "id",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET_NAME: "bucket",
    R2_PUBLIC_URL: "https://files.example.test",
    RESEND_API_KEY: "resend",
    RESEND_FROM_EMAIL: "no-reply@example.test",
  };

  it("lets the environment pass without it", () => {
    const result = envSchema.safeParse(requiredEnv);
    expect(result.success).toBe(true);
    expect(result.data?.GEMINI_API_KEY).toBeUndefined();
  });

  it("still accepts a key when one is given", () => {
    const result = envSchema.safeParse({ ...requiredEnv, GEMINI_API_KEY: "abc" });
    expect(result.data?.GEMINI_API_KEY).toBe("abc");
  });

  it("is the only thing that became optional: other required values are still required", () => {
    const { DATABASE_URL: _omit, ...withoutDatabase } = requiredEnv;
    expect(envSchema.safeParse(withoutDatabase).success).toBe(false);
  });

  it("loads the analysis code without a key, so the server can start", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(import("../../src/modules/candidate/cv-analysis.service")).resolves.toBeDefined();
  });

  it("knows whether a key is set, treating a blank one as missing", () => {
    process.env.GEMINI_API_KEY = "abc";
    expect(aiSettingsService.isGeminiConfigured()).toBe(true);
    process.env.GEMINI_API_KEY = "   ";
    expect(aiSettingsService.isGeminiConfigured()).toBe(false);
    delete process.env.GEMINI_API_KEY;
    expect(aiSettingsService.isGeminiConfigured()).toBe(false);
  });

  it("is never active without a key, without even asking the database", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(aiSettingsService.isCvAnalysisActive()).resolves.toBe(false);
  });
});

describe("toAiSummary", () => {
  it("keeps the summary, strengths and gaps", () => {
    expect(toAiSummary({ quickSummary: "Solid.", strengths: ["a"], gaps: ["b"] })).toEqual({
      quickSummary: "Solid.",
      strengths: ["a"],
      gaps: ["b"],
    });
  });

  it("drops the verdict, the hiring recommendation and any score from an older analysis", () => {
    const old = {
      quickSummary: "Solid.",
      strengths: ["a"],
      gaps: [],
      hiringSignal: "Do not interview.",
      verdict: "not_recommended",
      matchScore: 12,
    };
    expect(toAiSummary(old)).toEqual({ quickSummary: "Solid.", strengths: ["a"], gaps: [] });
  });

  it("copes with missing or malformed parts", () => {
    expect(toAiSummary(null)).toBeNull();
    expect(toAiSummary("nope")).toBeNull();
    expect(toAiSummary({ strengths: "x", gaps: [1, "real gap"] })).toEqual({
      quickSummary: "",
      strengths: [],
      gaps: ["real gap"],
    });
  });
});
