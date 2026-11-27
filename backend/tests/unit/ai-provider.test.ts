import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAiText, providerConfigured, selectedAiProvider } from "../../src/modules/candidate/ai-provider";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; vi.unstubAllGlobals(); });

describe("AI providers", () => {
  it("defaults to Gemini and checks only the selected key", () => {
    delete process.env.AI_CV_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "key";
    expect(selectedAiProvider()).toBe("gemini");
    expect(providerConfigured()).toBe(false);
    process.env.AI_CV_PROVIDER = "openai";
    expect(providerConfigured()).toBe(true);
  });

  it.each([
    ["openai", "OPENAI_API_KEY", "https://api.openai.com/v1/chat/completions"],
    ["grok", "XAI_API_KEY", "https://api.x.ai/v1/chat/completions"],
    ["anthropic", "ANTHROPIC_API_KEY", "https://api.anthropic.com/v1/messages"],
  ])("sends requests to %s and reads the response", async (provider, key, url) => {
    process.env.AI_CV_PROVIDER = provider;
    process.env[key] = "secret";
    process.env.AI_CV_MODEL = "test-model";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => provider === "anthropic" ? { content: [{ type: "text", text: "result" }] } : { choices: [{ message: { content: "result" } }] } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateAiText("prompt")).toBe("result");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(url);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body).toMatchObject({ model: "test-model", messages: [{ role: "user", content: "prompt" }] });
    if (provider === "openai") { expect(body.max_completion_tokens).toBe(4096); expect(body.max_tokens).toBeUndefined(); }
  });

  it("does not expose provider response bodies on errors", async () => {
    process.env.AI_CV_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(generateAiText("prompt")).rejects.toThrow("AI provider request failed (401)");
  });
});
