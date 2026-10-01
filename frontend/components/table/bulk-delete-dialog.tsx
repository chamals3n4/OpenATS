"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";

type BulkDeleteDialogProps = {
  isOpen: boolean;
  label: string;
  count: number;
  isPending?: boolean;
  isAllMatching?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function BulkDeleteDialog({
  isOpen,
  label,
  count,
  isPending,
  isAllMatching,
  onClose,
  onConfirm,
}: BulkDeleteDialogProps) {
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
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
