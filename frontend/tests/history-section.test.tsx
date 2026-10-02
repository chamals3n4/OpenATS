import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

let isManager = true;
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => isManager }));
vi.mock("@/hooks/queries/use-user", () => ({
  useUsers: () => ({
    data: isManager
      ? { data: [{ id: 1, firstName: "Chamal", lastName: "Senarathna" }] }
      : undefined,
  }),
}));

import { HistorySection } from "@/app/(dashboard)/candidates/[id]/_components/sections/history-section";
import type { CandidateDetail } from "@/types";

const stageMap = { 8: "Applied", 9: "Screening", 11: "Interviewed" };

const candidate = (history: CandidateDetail["history"], status = "active") =>
  ({ history, status }) as CandidateDetail;

const journey = [
  { id: 1, candidateId: 2, stageId: 8, movedBy: null, movedAt: "2026-09-09T09:00:00.000Z" },
  { id: 2, candidateId: 2, stageId: 9, movedBy: 1, movedAt: "2026-09-09T09:40:00.000Z" },
  { id: 3, candidateId: 2, stageId: 11, movedBy: 1, movedAt: "2026-09-09T10:10:00.000Z" },
];

beforeEach(() => {
  isManager = true;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-09T12:10:00.000Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HistorySection", () => {
  it("lists the newest stage first and marks it as current", () => {
    render(<HistorySection candidate={candidate(journey)} stageMap={stageMap} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Interviewed")).toBeTruthy();
    expect(within(items[0]).getByText("Current")).toBeTruthy();
    expect(within(items[2]).getByText("Applied")).toBeTruthy();
  });

  it("summarises the journey", () => {
    render(<HistorySection candidate={candidate(journey)} stageMap={stageMap} />);
    expect(screen.getByText("Current stage").nextSibling?.textContent).toBe("Interviewed");
    expect(screen.getByText("Time in this stage").nextSibling?.textContent).toBe("2 hours");
    expect(screen.getByText("In pipeline for").nextSibling?.textContent).toBe("3 hours 10 minutes");
    expect(screen.getByText("Stage moves").nextSibling?.textContent).toBe("2");
  });

  it("shows how long was spent in each earlier stage", () => {
    render(<HistorySection candidate={candidate(journey)} stageMap={stageMap} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("In this stage for 2 hours")).toBeTruthy();
    expect(within(items[1]).getByText("Spent 30 minutes here")).toBeTruthy();
    expect(within(items[2]).getByText("Spent 40 minutes here")).toBeTruthy();
  });

  it("names who moved the candidate for managers, and the application source for the first entry", () => {
    render(<HistorySection candidate={candidate(journey)} stageMap={stageMap} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[1]).getByText(/Moved by Chamal Senarathna/)).toBeTruthy();
    expect(within(items[2]).getByText(/Submitted an application/)).toBeTruthy();
  });

  it("does not show who moved the candidate to roles that cannot list users", () => {
    isManager = false;
    render(<HistorySection candidate={candidate(journey)} stageMap={stageMap} />);
    expect(screen.queryByText(/Moved by/)).toBeNull();
  });

  it("colours the current entry green once the candidate is hired", () => {
    const { container } = render(
      <HistorySection candidate={candidate(journey, "hired")} stageMap={stageMap} />,
    );
    const first = screen.getAllByRole("listitem")[0];
    expect(first.querySelector(".bg-green-600")).toBeTruthy();
    expect(container.querySelectorAll(".bg-green-600")).toHaveLength(1);
  });

  it("keeps the theme colour for the current stage while the candidate is not hired", () => {
    const { container } = render(
      <HistorySection candidate={candidate(journey)} stageMap={stageMap} />,
    );
    expect(container.querySelector(".bg-green-600")).toBeNull();
    expect(screen.getAllByRole("listitem")[0].querySelector(".bg-theme")).toBeTruthy();
  });

  it("recognises a stage literally named Hired", () => {
    const { container } = render(
      <HistorySection
        candidate={candidate(journey)}
        stageMap={{ ...stageMap, 11: "Hired" }}
      />,
    );
    expect(container.querySelectorAll(".bg-green-600")).toHaveLength(1);
  });

  it("shows an empty state with no history", () => {
    render(<HistorySection candidate={candidate([])} stageMap={stageMap} />);
    expect(screen.getByText("No stage history yet")).toBeTruthy();
  });
});
