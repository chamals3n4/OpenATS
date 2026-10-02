"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { Job } from "@/types";

interface JobDeleteDialogProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function JobDeleteDialog({
  job,
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: JobDeleteDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={isOpen}
      title="Delete this job?"
      description={
        <>
          <ConfirmDeleteName>{job?.title}</ConfirmDeleteName> will be
          permanently deleted. This cannot be undone.
        </>
      }
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
