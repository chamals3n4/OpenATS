import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

let isManager = true;
vi.mock("@/hooks/use-role", () => ({ useIsManager: () => isManager }));

import { CandidateHeader } from "@/app/(dashboard)/candidates/[id]/_components/candidate-header";
import type { CandidateDetail } from "@/types";

const candidate = (over: Partial<CandidateDetail> = {}) =>
  ({
    firstName: "Hasitha",
    lastName: "Erandika",
    email: "h@example.com",
    phone: "0717110160",
    appliedAt: "2026-09-09T09:00:00Z",
    jobTitle: "Software Engineering Intern",
    status: "hired",
    stageName: "Hired",
    resumeUrl: "https://example.com/cv.pdf",
    ...over,
  }) as CandidateDetail;

const handlers = () => ({
  onViewCv: vi.fn(),
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onStageChange: vi.fn(),
  onCancelStageChange: vi.fn(),
  onSaveStageChange: vi.fn(),
});

const renderHeader = (c = candidate(), over: Record<string, unknown> = {}) => {
  const h = handlers();
  render(
    <CandidateHeader
      candidate={c}
      offer={null}
      pipelineStages={[{ id: 1, name: "Applied" }, { id: 2, name: "Hired" }] as never}
      selectedStageId=""
      effectiveSelectedStageId="2"
      hasStageChange={false}
      moveStageMutation={{ isPending: false } as never}
      {...h}
      {...over}
    />,
  );
  return h;
};

beforeEach(() => {
  isManager = true;
});
afterEach(cleanup);

describe("CandidateHeader actions", () => {
  it("gives a manager every action, each doing its own thing", () => {
    const h = renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "View CV" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(h.onViewCv).toHaveBeenCalledOnce();
    expect(h.onEdit).toHaveBeenCalledOnce();
    expect(h.onDelete).toHaveBeenCalledOnce();
    expect(h.onClose).toHaveBeenCalledOnce();
  });

  it("shows the current stage by its name", () => {
    renderHeader();
    expect(screen.getByRole("combobox", { name: "Pipeline stage" }).textContent).toContain("Hired");
  });

  it("hides Edit and Delete from people who cannot use them, instead of showing them disabled", () => {
    isManager = false;
    renderHeader();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "View CV" })).toBeTruthy();
  });

  it("disables View CV when there is no CV", () => {
    renderHeader(candidate({ resumeUrl: null }));
    expect((screen.getByRole("button", { name: "View CV" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers Save and Cancel only once the stage has been changed", () => {
    renderHeader();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    cleanup();

    const h = renderHeader(candidate(), { hasStageChange: true });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(h.onSaveStageChange).toHaveBeenCalledOnce();
    expect(h.onCancelStageChange).toHaveBeenCalledOnce();
  });
});
