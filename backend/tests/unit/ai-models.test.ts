import { afterEach, describe, expect, it, vi } from "vitest";
import { listAiModels } from "../../src/modules/candidate/ai-models";
afterEach(() => vi.unstubAllGlobals());
describe("provider model lists", () => {
  it("follows Gemini pages and excludes models without text generation", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }, { name: "models/embedding", supportedGenerationMethods: ["embedContent"] }], nextPageToken: "next" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ models: [{ name: "models/gemini-2.5-pro", supportedGenerationMethods: ["generateContent"] }] }) });
    vi.stubGlobal("fetch", fetchMock);
    expect((await listAiModels("gemini", "key")).map((m) => m.id)).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
    expect(fetchMock.mock.calls[1]?.[0].searchParams.get("pageToken")).toBe("next");
  });
  it("includes newer OpenAI chat models while excluding speech and non-chat models", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [
      { id: "gpt-5" }, { id: "gpt-5.2-mini" }, { id: "gpt-6.2" }, { id: "gpt-4o-mini" },
      { id: "gpt-4o-mini-tts" }, { id: "gpt-4o-realtime-preview" }, { id: "gpt-5-pro" },
    ] }) }));
    expect((await listAiModels("openai", "key")).map((model) => model.id)).toEqual(["gpt-5", "gpt-5.2-mini", "gpt-6.2", "gpt-4o-mini"]);
  });
  it("preserves provider lifecycle information", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: "claude-old", lifecycle: "deprecated" }, { id: "claude-new", lifecycle: "active" }] }) }));
    expect((await listAiModels("anthropic", "key")).map((m) => m.lifecycle)).toEqual(["deprecated", "active"]);
  });
  it("rejects failed provider responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(listAiModels("openai", "key")).rejects.toThrow();
  });
});
