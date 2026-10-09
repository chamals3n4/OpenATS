import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const mutate = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/queries/use-user", () => ({
  useCurrentUser: () => ({ data: { data: { id: 7, role: "hiring_manager" } } }),
}));
vi.mock("@/hooks/queries/use-candidates", () => ({
  useRateCandidate: () => ({ mutate, isPending: false }),
}));

import { ScoreBreakdown } from "@/app/(dashboard)/candidates/[id]/_components/score-breakdown";
import type { CandidateDetail } from "@/types";

const candidate = (ratings: { userId: number; rating: number }[] = []) =>
  ({ id: 3, ratings, scoredParts: 0 }) as unknown as CandidateDetail;
const stars = () => screen.getByRole("radiogroup", { name: "Your rating" });
const star = (n: number) => within(stars()).getByRole("radio", { name: new RegExp(`^${n} of 5`) });
const updateButton = () => screen.getByRole("button", { name: "Update score" });

beforeEach(() => mutate.mockClear());
afterEach(cleanup);

describe("your rating", () => {
  it("starts with Update score disabled, since nothing has changed", () => {
    render(<ScoreBreakdown candidate={candidate()} />);
    expect(updateButton()).toBeDisabled();
  });

  it("shows a picked star at once, enables the button, and saves nothing yet", () => {
    render(<ScoreBreakdown candidate={candidate()} />);
    fireEvent.click(star(3));
    expect(star(3)).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Average")).toBeTruthy();
    expect(updateButton()).toBeEnabled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("saves the picked rating once, when Update score is pressed", () => {
    render(<ScoreBreakdown candidate={candidate()} />);
    for (const n of [1, 2, 4]) fireEvent.click(star(n));
    fireEvent.click(updateButton());
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toEqual({ id: 3, rating: 4 });
  });

  it("disables the button again if you pick your saved rating back", () => {
    render(<ScoreBreakdown candidate={candidate([{ userId: 7, rating: 5 }])} />);
    expect(star(5)).toHaveAttribute("aria-checked", "true");
    fireEvent.click(star(2));
    expect(updateButton()).toBeEnabled();
    fireEvent.click(star(5));
    expect(updateButton()).toBeDisabled();
  });

  it("can clear the rating, which then needs an update to save", () => {
    render(<ScoreBreakdown candidate={candidate([{ userId: 7, rating: 5 }])} />);
    fireEvent.click(star(5));
    expect(screen.getByText("Not rated")).toBeTruthy();
    fireEvent.click(updateButton());
    expect(mutate.mock.calls[0]![0]).toEqual({ id: 3, rating: null });
  });
});
