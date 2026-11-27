import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const save = vi.fn();
const remove = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/queries/use-candidate-notes", () => ({
  useCandidateNotes: () => ({ data: { data: [{ id: 1, candidateId: 2, authorName: "Ada", stageName: "Screening", body: "**Strong** experience", createdAt: "2026-01-01T12:00:00Z", updatedAt: "2026-01-01T12:00:00Z" }] }, isLoading: false, isError: false }),
  useSaveCandidateNote: () => ({ mutate: save, isPending: false }),
  useDeleteCandidateNote: () => ({ mutate: remove, isPending: false }),
}));
import { NotesSection } from "@/app/(dashboard)/candidates/[id]/_components/sections/notes-section";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
describe("candidate notes", () => {
  it("shows the author and preview, then renders Markdown in the popup", () => {
    render(<NotesSection candidateId={2} />);
    expect(screen.getByText(/Ada/)).toBeTruthy();
    expect(screen.getByText(/Screening/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ada/ }));
    expect(screen.getByText("Strong").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
  });
  it("creates a note with Markdown", () => {
    render(<NotesSection candidateId={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "# Interview notes" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(save).toHaveBeenCalledWith({ id: undefined, body: "# Interview notes" }, expect.anything());
  });
  it("opens edit and delete directly from note actions", () => {
    render(<NotesSection candidateId={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    expect(screen.getByRole("dialog", { name: "Edit note" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.getByText("Delete this note?")).toBeTruthy();
  });
  it("edits and confirms deletion", () => {
    render(<NotesSection candidateId={2} />);
    fireEvent.click(screen.getByRole("button", { name: /Ada/ }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(save).toHaveBeenCalledWith({ id: 1, body: "Updated" }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete note" }).at(-1)!);
    expect(remove).toHaveBeenCalledWith(1, expect.anything());
  });
});
