import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AiSettings } from "@/types";

const mutate = vi.fn();
let settings: AiSettings | undefined;
let isSuperAdmin = true;

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/use-role", () => ({ useRole: () => ({ isSuperAdmin }) }));
vi.mock("@/hooks/queries/use-settings", () => ({
  useAiSettings: () => ({ data: settings ? { data: settings } : undefined, isPending: !settings, isError: false }),
  useUpdateAiSettings: () => ({ mutate, isPending: false }),
}));

import { AiAnalysisCard } from "@/app/(dashboard)/settings/general/_components/ai-analysis-card";

const theSwitch = () => screen.getByRole("switch", { name: "AI CV analysis" });
// The switch is not a native input, so "disabled" shows as aria-disabled rather than the attribute.
const isLocked = () => theSwitch().getAttribute("aria-disabled") === "true" || theSwitch().hasAttribute("data-disabled");

beforeEach(() => {
  mutate.mockClear();
  isSuperAdmin = true;
  settings = { cvAnalysisEnabled: false, geminiConfigured: true, active: false };
});
afterEach(cleanup);

describe("AiAnalysisCard", () => {
  it("is off by default and says where the CVs go", () => {
    render(<AiAnalysisCard />);
    expect(theSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Sends candidates' CVs to Google Gemini/)).toBeTruthy();
    expect(screen.getByText(/Off\. No CV is sent anywhere/)).toBeTruthy();
  });

  it("turns on when switched", () => {
    render(<AiAnalysisCard />);
    fireEvent.click(theSwitch());
    expect(mutate).toHaveBeenCalledWith(true, expect.anything());
  });

  it("cannot be turned on without a Gemini key, and says how to add one", () => {
    settings = { cvAnalysisEnabled: false, geminiConfigured: false, active: false };
    render(<AiAnalysisCard />);
    expect(isLocked()).toBe(true);
    expect(screen.getByText(/Add a Gemini API key to use this/)).toBeTruthy();
    fireEvent.click(theSwitch());
    expect(mutate).not.toHaveBeenCalled();
  });

  it("shows as off when it was turned on but the key has since been removed", () => {
    settings = { cvAnalysisEnabled: true, geminiConfigured: false, active: false };
    render(<AiAnalysisCard />);
    expect(theSwitch()).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Add a Gemini API key to use this/)).toBeTruthy();
  });

  it("shows as on, and can be turned off", () => {
    settings = { cvAnalysisEnabled: true, geminiConfigured: true, active: true };
    render(<AiAnalysisCard />);
    expect(theSwitch()).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/not part of the candidate's score/)).toBeTruthy();
    fireEvent.click(theSwitch());
    expect(mutate).toHaveBeenCalledWith(false, expect.anything());
  });

  it("is read-only for anyone but a super admin, hiring managers included", () => {
    isSuperAdmin = false;
    render(<AiAnalysisCard />);
    expect(isLocked()).toBe(true);
    fireEvent.click(theSwitch());
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/Only a super admin can change this/)).toBeTruthy();
  });
});
