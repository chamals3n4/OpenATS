import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BulkDeleteDialog } from "@/components/table/bulk-delete-dialog";

const renderDialog = (props: Partial<Parameters<typeof BulkDeleteDialog>[0]> = {}) => {
  const onConfirm = vi.fn();
  render(
    <BulkDeleteDialog
      isOpen
      label="candidate"
      count={37}
      onClose={vi.fn()}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm, deleteButton: () => screen.getByRole("button", { name: "Delete" }) };
};

describe("BulkDeleteDialog", () => {
  it("says exactly how many will be deleted", () => {
    renderDialog({ isAllMatching: true });
    expect(screen.getByRole("heading")).toHaveTextContent("Delete all 37 matching candidates?");
  });

  it("deletes picked rows on one confirmation", () => {
    const { onConfirm, deleteButton } = renderDialog();

    fireEvent.click(deleteButton());

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("keeps Delete off until the number is typed, when that is required", () => {
    const { onConfirm, deleteButton } = renderDialog({ isAllMatching: true, requireTypedCount: true });
    const field = screen.getByLabelText(/to confirm/);
    expect(deleteButton()).toBeDisabled();

    fireEvent.change(field, { target: { value: "3" } });
    expect(deleteButton()).toBeDisabled();

    fireEvent.change(field, { target: { value: "37" } });
    expect(deleteButton()).toBeEnabled();

    fireEvent.click(deleteButton());
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
