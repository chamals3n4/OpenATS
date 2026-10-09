import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/lib/auth-action", () => ({ serverFetch: vi.fn() }));

import { CandidateFilters } from "@/app/(dashboard)/candidates/_components/candidate-filters";
import { EMPTY_FILTERS, type CandidateFilterState } from "@/app/(dashboard)/candidates/lib/candidate-filter-state";
import { candidateListParams } from "@/hooks/queries/use-candidates";
import type { Job } from "@/types";

// The command list the position picker uses needs these in a browser, and jsdom has neither.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(cleanup);

const jobs = [
  { id: 3, title: "Software Engineering Intern" },
  { id: 4, title: "Product Designer" },
] as Job[];

function setup(value: CandidateFilterState = EMPTY_FILTERS, over: { hideScoreFilters?: boolean } = {}) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(
    <CandidateFilters
      search=""
      onSearchChange={vi.fn()}
      jobs={jobs}
      value={value}
      onChange={onChange}
      onClear={onClear}
      {...over}
    />,
  );
  return { onChange, onClear };
}

const open = (el: HTMLElement) => {
  fireEvent.pointerDown(el, { button: 0 });
  fireEvent.click(el);
};

describe("candidateListParams", () => {
  it("sends only the filters that are set", () => {
    expect(candidateListParams({ page: 1, limit: 15 }).toString()).toBe("page=1&limit=15");
    const p = candidateListParams({ minScore: 70, flag: "failed_assessment", fullyScored: true, sort: "score", search: "ann" });
    expect(p.get("minScore")).toBe("70");
    expect(p.get("flag")).toBe("failed_assessment");
    expect(p.get("fullyScored")).toBe("true");
    expect(p.get("sort")).toBe("score");
    expect(p.get("search")).toBe("ann");
  });

  it("keeps a minimum score of 0, which is a real choice", () => {
    expect(candidateListParams({ minScore: 0 }).get("minScore")).toBe("0");
    expect(candidateListParams({ fullyScored: false }).has("fullyScored")).toBe(false);
  });
});

describe("the filter bar", () => {
  it("shows no chips, and no Clear all, when nothing is on", () => {
    setup();
    expect(screen.queryByLabelText("Active filters")).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("picks a position from a searchable list", async () => {
    const { onChange } = setup();
    open(screen.getByRole("button", { name: "Choose a position" }));
    fireEvent.change(await screen.findByPlaceholderText("Search positions..."), { target: { value: "design" } });
    await waitFor(() => expect(screen.queryByText("Software Engineering Intern")).toBeNull());
    fireEvent.click(screen.getByText("Product Designer"));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, jobId: 4 });
  });

  it("keeps the chosen position on screen as a chip, and removes it from the chip", () => {
    const value = { ...EMPTY_FILTERS, jobId: 3 };
    const { onChange } = setup(value);
    const chips = screen.getByLabelText("Active filters");
    expect(within(chips).getByText("Software Engineering Intern")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Software Engineering Intern" }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it("shows a chip for each filter, and Clear all clears them together", () => {
    const { onClear } = setup({ ...EMPTY_FILTERS, minScore: 70, flag: "none", fullyScored: true });
    const chips = screen.getByLabelText("Active filters");
    for (const text of ["Score 70+", "No flags", "All parts scored"]) expect(within(chips).getByText(text)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("counts the filters inside the Filters menu on its button", () => {
    setup({ ...EMPTY_FILTERS, status: "active", minScore: 70 });
    expect(screen.getByRole("button", { name: "Filters, 2 on" })).toBeTruthy();
  });

  it("has the minimum score and 'all parts scored' inside the Filters menu", async () => {
    setup();
    open(screen.getByRole("button", { name: "Filters" }));
    expect(await screen.findByLabelText("Minimum score")).toBeTruthy();
    expect(screen.getByText("All parts scored")).toBeTruthy();
  });

  it("applies a typed minimum score once typing pauses", async () => {
    const { onChange } = setup();
    open(screen.getByRole("button", { name: "Filters" }));
    fireEvent.change(await screen.findByLabelText("Minimum score"), { target: { value: "70" } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, minScore: 70 }));
  });

  it("hides the score filters, and their chips, from an interviewer", async () => {
    setup({ ...EMPTY_FILTERS, minScore: 70, fullyScored: true }, { hideScoreFilters: true });
    expect(screen.queryByLabelText("Active filters")).toBeNull();
    open(screen.getByRole("button", { name: /^Filters/ }));
    await screen.findByText("Flags");
    expect(screen.queryByLabelText("Minimum score")).toBeNull();
    expect(screen.queryByText("All parts scored")).toBeNull();
  });
});
