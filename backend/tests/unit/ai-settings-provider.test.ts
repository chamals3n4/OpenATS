import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ row: undefined as Record<string, unknown> | undefined }));
vi.mock("../../src/db", () => ({ db: {
  select: () => ({ from: () => ({ limit: async () => state.row ? [state.row] : [] }) }),
  insert: () => ({ values: (values: Record<string, unknown>) => ({ onConflictDoUpdate: async ({ set }: { set: Record<string, unknown> }) => { state.row = state.row ? { ...state.row, ...set } : { aiCvAnalysisEnabled: false, ...values }; } }) }),
} }));
import { aiSettingsService } from "../../src/modules/settings/ai-settings.service";

beforeEach(() => {
  state.row = undefined;
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.AI_CV_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "environment-key";
});

describe("AI provider settings", () => {
  it("encrypts keys, keeps them private, and disables analysis when changing providers", async () => {
    state.row = { aiCvAnalysisEnabled: true, aiCvProvider: "gemini", aiCvApiKeyEncrypted: null };
    const result = await aiSettingsService.setProvider("openai", "private-key");
    expect(result).toMatchObject({ provider: "openai", configured: true, active: false });
    expect(JSON.stringify(result)).not.toContain("private-key");
    expect(state.row?.aiCvApiKeyEncrypted).not.toContain("private-key");
    await expect(aiSettingsService.credentials()).resolves.toEqual({ provider: "openai", apiKey: "private-key", model: "gpt-4o-mini" });
  });
  it("does not provide worker credentials while analysis is disabled", async () => {
    state.row = { aiCvAnalysisEnabled: false, aiCvProvider: "gemini", aiCvApiKeyEncrypted: null };
    expect(await aiSettingsService.activeCredentials()).toBeNull();
    state.row.aiCvAnalysisEnabled = true;
    expect(await aiSettingsService.activeCredentials()).toMatchObject({ provider: "gemini", apiKey: "environment-key" });
  });
  it("removes the provider and prevents environment fallback from reactivating it", async () => {
    state.row = { aiCvAnalysisEnabled: true, aiCvProvider: null, aiCvApiKeyEncrypted: null };
    expect((await aiSettingsService.get()).active).toBe(true);
    expect(await aiSettingsService.removeProvider()).toMatchObject({ configured: false, active: false });
    await expect(aiSettingsService.credentials()).rejects.toThrow();
    await expect(aiSettingsService.setCvAnalysisEnabled(true)).rejects.toThrow();
    await aiSettingsService.setProvider("gemini", "new-key");
    expect(await aiSettingsService.get()).toMatchObject({ configured: true, active: false });
  });
});
