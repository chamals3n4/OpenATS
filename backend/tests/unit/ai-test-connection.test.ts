import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({ credentials: vi.fn(), generate: vi.fn() }));
vi.mock("../../src/modules/candidate/ai-provider", () => ({ generateAiText: mocks.generate }));
vi.mock("../../src/modules/settings/ai-settings.service", () => ({
  aiSettingsService: { credentials: mocks.credentials },
  GeminiNotConfiguredError: class extends Error {},
}));
import { testAiProvider } from "../../src/modules/settings/ai-settings.controller";

beforeEach(() => { vi.clearAllMocks(); mocks.credentials.mockResolvedValue({ provider: "openai", apiKey: "secret" }); });
describe("AI connection test", () => {
  it("uses saved credentials and sends no CV data", async () => {
    mocks.generate.mockResolvedValue("Hello");
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await testAiProvider({} as Request, response as unknown as Response);
    expect(mocks.generate).toHaveBeenCalledWith("Reply with a short greeting.", undefined, { provider: "openai", apiKey: "secret" });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ data: { connected: true } });
  });
  it("does not return provider errors or secrets", async () => {
    mocks.generate.mockRejectedValue(new Error("secret"));
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await testAiProvider({} as Request, response as unknown as Response);
    expect(response.status).toHaveBeenCalledWith(502);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("secret");
  });
});
