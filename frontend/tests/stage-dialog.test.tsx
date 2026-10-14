import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

let isManager = true;
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => isManager }));
vi.mock("@/hooks/use-drag-sort", () => ({ useDragSort: () => ({ ref: () => {}, isDragging: false, isOver: false }) }));

import { StageDialog } from "@/app/(dashboard)/jobs/[id]/_components/dialogs/stage-dialog";
import { HiringProcessTabView } from "@/app/(dashboard)/jobs/[id]/_components/tabs/hiring-process-tab";
import type { PipelineStage } from "@/types";

const stage = (id: number, name: string, stageType: PipelineStage["stageType"]) =>
  ({ id, jobId: 1, name, position: id, stageType, color: "bg-blue-500" }) as PipelineStage & { color: string };

const onSubmit = vi.fn();
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  isManager = true;
});
afterEach(cleanup);

describe("StageDialog", () => {
  it("adds a stage with the name typed and the type picked", () => {
    render(<StageDialog open stage={null} isPending={false} onSubmit={onSubmit} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Add a stage")).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText(/Stage name/), { target: { value: "  Technical interview " } });
    fireEvent.click(within(dialog).getByRole("radio", { name: /^Interview/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add stage" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Technical interview", stageType: "interview" });
  });

  it("says what is missing instead of doing nothing", () => {
    render(<StageDialog open stage={null} isPending={false} onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Add stage" }));
    expect(screen.getByText("Enter a name for the stage.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens an existing stage with its name and type, and saves changes to both", () => {
    render(<StageDialog open stage={stage(4, "Final round", "interview")} isPending={false} onSubmit={onSubmit} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Edit stage")).toBeTruthy();
    expect((within(dialog).getByLabelText(/Stage name/) as HTMLInputElement).value).toBe("Final round");
    expect(within(dialog).getByRole("radio", { name: /^Interview/ }).getAttribute("aria-checked")).toBe("true");

    fireEvent.change(within(dialog).getByLabelText(/Stage name/), { target: { value: "Offer call" } });
    fireEvent.click(within(dialog).getByRole("radio", { name: /^Offer/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Offer call", stageType: "offer" });
  });
});

describe("HiringProcessTabView", () => {
  const props = {
    stages: [stage(1, "Applied", "screening"), stage(2, "Technical interview", "interview")],
    onAddStage: vi.fn(),
    onEditStage: vi.fn(),
    setStageDeleteTarget: vi.fn(),
    handleStageReorder: vi.fn(),
  };

  it("lists the stages in order with their type, and has no inline editing", () => {
    render(<HiringProcessTabView {...props} />);
    expect(screen.getByText("Technical interview")).toBeTruthy();
    expect(screen.getByText("Screening")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("hands the stage to the edit dialog and asks before deleting", () => {
    render(<HiringProcessTabView {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit the stage Technical interview" }));
    expect(props.onEditStage).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));

    fireEvent.click(screen.getByRole("button", { name: "Delete the stage Applied" }));
    expect(props.setStageDeleteTarget).toHaveBeenCalledWith({ id: 1, name: "Applied" });
  });

  it("is read-only for people who cannot change the pipeline", () => {
    isManager = false;
    render(<HiringProcessTabView {...props} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
