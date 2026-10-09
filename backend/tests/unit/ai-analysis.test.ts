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
  it("lets the environment pass without it", () => {
    const { GEMINI_API_KEY: _omit, ...withoutKey } = process.env;
    const result = envSchema.safeParse(withoutKey);
    expect(result.success).toBe(true);
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
