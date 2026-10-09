import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BoardColumn } from "@/app/(dashboard)/jobs/[id]/pipeline/_components/board-column";
import { BoardHeader } from "@/app/(dashboard)/jobs/[id]/pipeline/_components/board-header";
import { BoardFiltersBar } from "@/app/(dashboard)/jobs/[id]/pipeline/_components/board-filters-bar";
import { BulkActionBar } from "@/app/(dashboard)/jobs/[id]/pipeline/_components/bulk-action-bar";
import { EMPTY_FILTERS } from "@/app/(dashboard)/jobs/[id]/pipeline/lib/board-filters";
import { MoveConfirmDialog } from "@/app/(dashboard)/jobs/[id]/pipeline/_components/move-confirm-dialog";
import type { BoardCandidate, PipelineStage } from "@/types";

afterEach(cleanup);

const stage = (id: number, name: string, stageType: PipelineStage["stageType"] = "screening"): PipelineStage => ({
  id,
  jobId: 1,
  name,
  position: id,
  stageType,
  sourceTemplateId: null,
  createdAt: "",
  updatedAt: "",
});
const stages = [stage(1, "Applied"), stage(2, "Interview", "interview"), stage(3, "Offer", "offer")];

const cand = (id: number, first: string, last: string, stageId = 1): BoardCandidate => ({
  id,
  firstName: first,
  lastName: last,
  email: `${first.toLowerCase()}@x.com`,
  jobId: 1,
  currentStageId: stageId,
  status: "active",
  appliedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  updatedAt: "",
  stageEnteredAt: null,
});

function setup(candidates: BoardCandidate[], extra: { isLoading?: boolean; movingIds?: number[]; totalCount?: number; selectedIds?: number[] } = {}) {
  const onOpen = vi.fn();
  const onMove = vi.fn();
  const onToggleSelect = vi.fn();
  const onToggleColumn = vi.fn();
  render(
    <DndProvider backend={HTML5Backend}>
      <BoardColumn
        stage={stages[0]}
        stages={stages}
        candidates={candidates}
        totalCount={extra.totalCount ?? candidates.length}
        now={Date.now()}
        isLoading={extra.isLoading ?? false}
        movingIds={new Set(extra.movingIds ?? [])}
        isSearching={false}
        selectedIds={new Set(extra.selectedIds ?? [])}
        selectionMode={(extra.selectedIds ?? []).length > 0}
        onToggleSelect={onToggleSelect}
        onToggleColumn={onToggleColumn}
        onOpen={onOpen}
        onMove={onMove}
      />
    </DndProvider>,
  );
  return { onOpen, onMove, onToggleSelect, onToggleColumn };
}

describe("BoardColumn", () => {
  it("shows the stage, its count and each candidate with how long ago they applied", () => {
    setup([cand(1, "Ada", "Lovelace"), cand(2, "Grace", "Hopper")]);
    expect(screen.getByRole("heading", { name: "Applied" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    // The card shows the first name only; the full name stays in its tooltip and labels.
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.getAllByText("Applied 3h ago")).toHaveLength(2);
    expect(screen.queryByText("AL")).toBeNull();
  });

  it("says so when the stage is empty, and shows skeletons, not 'empty', while loading", () => {
    setup([]);
    expect(screen.getByText("No candidates in this stage")).toBeInTheDocument();
    cleanup();
    setup([], { isLoading: true });
    expect(screen.queryByText("No candidates in this stage")).not.toBeInTheDocument();
  });

  it("opens the profile on click and on Enter, but not when Enter is pressed inside the menu button", () => {
    const { onOpen } = setup([cand(7, "Ada", "Lovelace")]);
    const card = screen.getByRole("button", { name: /Ada Lovelace, applied 3h ago/ });
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith(7);
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(screen.getByRole("button", { name: "Actions for Ada Lovelace" }), { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("moves a card to the top of another stage from its menu, with no dragging", async () => {
    const { onMove, onOpen } = setup([cand(7, "Ada", "Lovelace")]);
    const trigger = screen.getByRole("button", { name: "Actions for Ada Lovelace" });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    const target = await screen.findByRole("menuitem", { name: "Interview" });
    fireEvent.click(target);
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(7, 2, 0));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("disables the stage the candidate is already in", async () => {
    setup([cand(7, "Ada", "Lovelace")]);
    const trigger = screen.getByRole("button", { name: "Actions for Ada Lovelace" });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    const current = await screen.findByRole("menuitem", { name: /Applied/ });
    expect(current).toHaveAttribute("aria-disabled", "true");
  });

  it("marks a card whose move is still saving as busy", () => {
    setup([cand(7, "Ada", "Lovelace")], { movingIds: [7] });
    expect(screen.getByRole("button", { name: /Ada Lovelace, applied/ })).toHaveAttribute("aria-busy", "true");
  });
});

describe("selection", () => {
  const two = [cand(7, "Ada", "Lovelace"), cand(8, "Grace", "Hopper")];

  it("toggles a card from its checkbox without opening the profile", () => {
    const { onToggleSelect, onOpen } = setup(two);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Ada Lovelace" }));
    expect(onToggleSelect).toHaveBeenCalledWith(7);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("shows no avatar, and outlines a selected card with a single theme border", () => {
    setup(two, { selectedIds: [7] });
    const selected = screen.getByRole("button", { name: /Ada Lovelace, applied/ });
    expect(selected.className).toMatch(/border-theme/);
    expect(selected.className).not.toMatch(/ring-/);
    expect(screen.getByRole("button", { name: /Grace Hopper, applied/ }).className).not.toMatch(/border-theme/);
  });

  it("always shows the select box, so a click cannot leave it stuck half-hidden", () => {
    setup(two);
    expect(screen.getByRole("checkbox", { name: "Select Ada Lovelace" }).className).not.toMatch(/opacity-0/);
  });

  it("toggles instead of opening once something is selected", () => {
    const { onToggleSelect, onOpen } = setup(two, { selectedIds: [7] });
    const card = screen.getByRole("button", { name: /Grace Hopper, applied 3h ago. Toggle selection/ });
    fireEvent.click(card);
    expect(onToggleSelect).toHaveBeenCalledWith(8);
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Ada Lovelace, applied/ })).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  it("selects the whole column from its header, showing a partial selection as mixed", () => {
    const { onToggleColumn } = setup(two, { selectedIds: [7] });
    const all = screen.getByRole("checkbox", { name: "Select all 2 in Applied" });
    expect(all).toHaveAttribute("aria-checked", "mixed");
    fireEvent.click(all);
    expect(onToggleColumn).toHaveBeenCalledWith([7, 8]);
  });

  it("offers Select in the card menu", async () => {
    const { onToggleSelect } = setup(two);
    const trigger = screen.getByRole("button", { name: "Actions for Ada Lovelace" });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Select" }));
    await waitFor(() => expect(onToggleSelect).toHaveBeenCalledWith(7));
  });
});

describe("BulkActionBar", () => {
  it("is hidden until something is selected", () => {
    render(<BulkActionBar count={0} stages={stages} onMove={() => {}} onClear={() => {}} />);
    expect(screen.queryByRole("region", { name: "Bulk actions" })).not.toBeInTheDocument();
  });

  it("shows the count, moves to a chosen stage and clears", async () => {
    const onMove = vi.fn();
    const onClear = vi.fn();
    render(<BulkActionBar count={3} stages={stages} onMove={onMove} onClear={onClear} />);
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    const trigger = screen.getByRole("button", { name: /Move to/ });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Interview" }));
    await waitFor(() => expect(onMove).toHaveBeenCalledWith(2));

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe("BoardFiltersBar", () => {
  it("shows no clear button until a filter is on, then counts the filters", () => {
    const onClear = vi.fn();
    const { rerender } = render(
      <BoardFiltersBar filters={EMPTY_FILTERS} stages={stages} onChange={() => {}} onClear={onClear} />,
    );
    expect(screen.queryByRole("button", { name: /Clear filters/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stages shown" })).toHaveTextContent("All stages");

    rerender(
      <BoardFiltersBar
        filters={{ ...EMPTY_FILTERS, status: "hired", inStage: "7" }}
        stages={stages}
        onChange={() => {}}
        onClear={onClear}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters (2)" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("hides a stage column by unticking it, starting from all stages", async () => {
    const onChange = vi.fn();
    render(<BoardFiltersBar filters={EMPTY_FILTERS} stages={stages} onChange={onChange} onClear={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Stages shown" });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Interview" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ stageIds: [1, 3] }));
  });

  it("goes back to all stages when the last hidden one is ticked again", async () => {
    const onChange = vi.fn();
    render(
      <BoardFiltersBar
        filters={{ ...EMPTY_FILTERS, stageIds: [1, 3] }}
        stages={stages}
        onChange={onChange}
        onClear={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Stages shown" })).toHaveTextContent("2 of 3 stages");
    const trigger = screen.getByRole("button", { name: "Stages shown" });
    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Interview" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ stageIds: [] }));
  });
});

describe("paging", () => {
  const many = Array.from({ length: 120 }, (_, i) => cand(i + 1, `First${i}`, "Person"));

  it("draws 50 cards, then 50 more, then the rest, while the count stays the full total", () => {
    setup(many);
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-board-card]")).toHaveLength(50);

    fireEvent.click(screen.getByRole("button", { name: "Show 50 more (70 not shown)" }));
    expect(document.querySelectorAll("[data-board-card]")).toHaveLength(100);

    fireEvent.click(screen.getByRole("button", { name: "Show 20 more (20 not shown)" }));
    expect(document.querySelectorAll("[data-board-card]")).toHaveLength(120);
    expect(screen.queryByRole("button", { name: /Show .* more/ })).not.toBeInTheDocument();
  }, 20_000);

  it("shows no button when everything fits", () => {
    setup(many.slice(0, 50));
    expect(screen.queryByRole("button", { name: /Show .* more/ })).not.toBeInTheDocument();
  });
});

describe("search", () => {
  it("shows how many of the stage's cards match, and why a column looks empty", () => {
    setup([cand(1, "Ada", "Lovelace")], { totalCount: 5 });
    expect(screen.getByText("1 of 5")).toBeInTheDocument();
    cleanup();
    setup([], { totalCount: 5 });
    expect(screen.getByText("No matches in this stage")).toBeInTheDocument();
  });

  it("types into the header search, clears with the button and with Escape", () => {
    const onSearchChange = vi.fn();
    const job = { title: "Engineer", status: "published" as const, employmentType: "full_time" as const, location: null };
    const { rerender } = render(
      <BoardHeader jobId={1} job={job} candidateCount={8} matchCount={null} search="" onSearchChange={onSearchChange} />,
    );
    expect(screen.getByText(/8 candidates in process/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search candidates" }), { target: { value: "ada" } });
    expect(onSearchChange).toHaveBeenCalledWith("ada");

    rerender(
      <BoardHeader jobId={1} job={job} candidateCount={8} matchCount={3} search="ada" onSearchChange={onSearchChange} />,
    );
    expect(screen.getByText(/3 of 8 match/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onSearchChange).toHaveBeenLastCalledWith("");
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(onSearchChange).toHaveBeenCalledTimes(3);
  });
});

describe("MoveConfirmDialog", () => {
  const base = { kind: "single" as const, candidates: [cand(7, "Ada", "Lovelace")], index: 0 };

  it("explains an offer draft and an assessment email together", () => {
    render(
      <MoveConfirmDialog
        pending={{ ...base, stage: stages[2], effects: { createsOffer: true, sendsAssessment: true } }}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Move to Offer?")).toBeInTheDocument();
    expect(screen.getByText(/creates an offer draft for them and emails them the assessment/)).toBeInTheDocument();
  });

  it("words a bulk move for several candidates", () => {
    render(
      <MoveConfirmDialog
        pending={{
          kind: "bulk",
          candidates: [cand(1, "A", "A"), cand(2, "B", "B"), cand(3, "C", "C")],
          stage: stages[1],
          index: 0,
          effects: { createsOffer: false, sendsAssessment: true },
        }}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Move 3 candidates to Interview?")).toBeInTheDocument();
    expect(screen.getByText(/emails each of them the assessment for this stage/)).toBeInTheDocument();
  });

  it("confirms and cancels", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <MoveConfirmDialog
        pending={{ ...base, stage: stages[1], effects: { createsOffer: false, sendsAssessment: true } }}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing when there is no pending move", () => {
    render(<MoveConfirmDialog pending={null} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
