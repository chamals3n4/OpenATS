"use client";

import { useState } from "react";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { Input } from "@/components/ui/input";

type BulkDeleteDialogProps = {
  isOpen: boolean;
  label: string;
  count: number;
  isPending?: boolean;
  isAllMatching?: boolean;
  /**
   * Makes the person type the number before Delete works. For "all matching", where the rows
   * being deleted are mostly on pages they have not looked at.
   */
  requireTypedCount?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function BulkDeleteDialog({
  isOpen,
  label,
  count,
  isPending,
  isAllMatching,
  requireTypedCount = false,
  onClose,
  onConfirm,
}: BulkDeleteDialogProps) {
  const [typed, setTyped] = useState("");
  // Start empty each time the dialog opens, however it was closed.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setTyped("");
  }

  const pluralLabel = count === 1 ? label : `${label}s`;
  const subject = isAllMatching
    ? `all ${count} matching ${pluralLabel}`
    : `${count} selected ${pluralLabel}`;

  return (
    <ConfirmDeleteDialog
      open={isOpen}
      title={`Delete ${subject}?`}
      description={
        <>
          <ConfirmDeleteName>{subject}</ConfirmDeleteName> will be permanently
          deleted. This cannot be undone.
        </>
      }
      isPending={isPending}
      confirmDisabled={requireTypedCount && typed.trim() !== String(count)}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {requireTypedCount && (
        <div className="space-y-1.5">
          <label
            htmlFor="bulk-delete-count"
            className="text-sm text-slate-600 dark:text-neutral-400"
          >
            Type <ConfirmDeleteName>{count}</ConfirmDeleteName> to confirm
          </label>
          <Input
            id="bulk-delete-count"
            inputMode="numeric"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      )}
    </ConfirmDeleteDialog>
  );
}
