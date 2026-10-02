"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { Template } from "@/types";

interface TemplateDeleteDialogProps {
  template: Template | null;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TemplateDeleteDialog({
  template,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: TemplateDeleteDialogProps) {
  return (
    <ConfirmDeleteDialog
      open={isOpen}
      title="Delete this template?"
      description={
        <>
          <ConfirmDeleteName>{template?.name}</ConfirmDeleteName> will be
          permanently deleted. This cannot be undone.
        </>
      }
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
