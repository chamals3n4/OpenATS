import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AiSettings } from "@/types";

const save = vi.fn();
const remove = vi.fn();
const toggle = vi.fn();
const testConnection = vi.fn();
const saveModel = vi.fn();
let settings: AiSettings;
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/queries/use-settings", () => ({
  useAiSettings: () => ({ data: { data: settings }, isPending: false, isError: false }),
  useUpdateAiSettings: () => ({ mutate: toggle, isPending: false }),
  useUpdateAiProvider: () => ({ mutate: save, isPending: false }),
  useDeleteAiProvider: () => ({ mutate: remove, isPending: false }),
  useAiModels: () => ({ data: { data: [{ id: "gpt-4o", name: "GPT-4o", lifecycle: "active" }] }, isPending: false, isError: false }),
  useUpdateAiModel: () => ({ mutate: saveModel, isPending: false }),
  useTestAiProvider: () => ({ mutate: testConnection, isPending: false }),
}));
import { AiProviders } from "@/app/(dashboard)/settings/ai-apis/_components/ai-providers";
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); vi.clearAllMocks(); settings = { cvAnalysisEnabled: false, geminiConfigured: false, provider: "gemini", model: "gemini-3-flash-preview", configured: false, active: false }; });
afterEach(cleanup);
describe("AI providers", () => {
  it("adds one provider", () => {
    render(<AiProviders />); fireEvent.click(screen.getByRole("button", { name: "Add provider" }));
    fireEvent.change(screen.getByLabelText("Provider"), { target: { value: "openai" } });
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Save provider" }));
    expect(save).toHaveBeenCalledWith({ provider: "openai", apiKey: "secret" }, expect.anything());
  });
  it("shows one configured provider with edit, removal and switch controls", () => {
    settings = { ...settings, configured: true, provider: "openai" };
    render(<AiProviders />); expect(screen.getByText("OpenAI")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add provider" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Test connection" })); expect(testConnection).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: "AI CV analysis" })); expect(toggle).toHaveBeenCalledWith(true, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Remove" })); fireEvent.click(screen.getByRole("button", { name: "Remove provider" }));
    expect(remove).toHaveBeenCalled();
  });
  it("shows an unavailable model and saves a listed replacement", () => {
    settings = { ...settings, configured: true, provider: "openai", model: "old-model" };
    render(<AiProviders />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable or no longer supported");
    expect(screen.getByRole("combobox", { name: "Choose model" })).toHaveTextContent("old-model");
    fireEvent.click(screen.getByRole("combobox", { name: "Choose model" }));
    fireEvent.change(screen.getByPlaceholderText("Search models"), { target: { value: "gpt-4o" } });
    fireEvent.click(screen.getByRole("option", { name: "gpt-4o" }));
    fireEvent.click(screen.getByRole("button", { name: "Save model" }));
    expect(saveModel).toHaveBeenCalledWith("gpt-4o", expect.anything());
  });
  it("allows replacing the key without exposing the old one", () => {
    settings = { ...settings, configured: true, provider: "openai" };
    render(<AiProviders />); fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("API key")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "new key" } });
    fireEvent.click(screen.getByRole("button", { name: "Save provider" }));
    expect(save).toHaveBeenCalledWith({ provider: "openai", apiKey: "new key" }, expect.anything());
  });
});
