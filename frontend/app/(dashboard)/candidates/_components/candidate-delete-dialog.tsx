"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { Candidate } from "@/types";

interface CandidateDeleteDialogProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function CandidateDeleteDialog({
  candidate,
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: CandidateDeleteDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={isOpen}
      title="Delete this candidate?"
      description={
        <>
          <ConfirmDeleteName>
            {candidate?.firstName} {candidate?.lastName}
          </ConfirmDeleteName>{" "}
          will be permanently deleted. This cannot be undone.
        </>
      }
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
