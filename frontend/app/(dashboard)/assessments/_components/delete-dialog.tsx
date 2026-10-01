"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { Assessment } from "@/types";

interface AssessmentDeleteDialogProps {
  assessment: Assessment | null;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AssessmentDeleteDialog({
  assessment,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: AssessmentDeleteDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={isOpen}
      title="Delete this assessment?"
      description={
        <>
          <ConfirmDeleteName>{assessment?.title}</ConfirmDeleteName> will be
          permanently deleted. This cannot be undone.
        </>
      }
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
