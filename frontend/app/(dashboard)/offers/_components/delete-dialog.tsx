"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { OfferWithRelations } from "@/types";
import { getCandidateName } from "../lib/offer-utils";

interface OfferDeleteDialogProps {
  offer: OfferWithRelations | null;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function OfferDeleteDialog({
  offer,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: OfferDeleteDialogProps) {
  const candidateName = offer ? getCandidateName(offer) : "";

  return (
    <ConfirmDeleteDialog
      open={isOpen}
      title="Delete this offer?"
      description={
        <>
          The offer for <ConfirmDeleteName>{candidateName}</ConfirmDeleteName>{" "}
          will be permanently deleted. This cannot be undone.
        </>
      }
      isPending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
