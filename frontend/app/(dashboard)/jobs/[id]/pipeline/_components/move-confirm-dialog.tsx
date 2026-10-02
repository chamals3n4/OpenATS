"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { fullName } from "../lib/board-utils";
import type { PendingMove } from "../hooks/use-board-moves";

interface MoveConfirmDialogProps {
  pending: PendingMove | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** Asked before a move that does more than move the card, because an email cannot be unsent. */
export function MoveConfirmDialog({ pending, onClose, onConfirm }: MoveConfirmDialogProps) {
  const count = pending?.candidates.length ?? 0;
  const many = count > 1;

  return (
    <ConfirmDeleteDialog
      open={pending !== null}
      title={pending ? many ? `Move ${count} candidates to ${pending.stage.name}?` : `Move to ${pending.stage.name}?` : ""}
      description={
        pending && (
          <>
            Moving{" "}
            <ConfirmDeleteName>
              {many ? `${count} candidates` : fullName(pending.candidates[0])}
            </ConfirmDeleteName>{" "}
            here
            {pending.effects.createsOffer &&
              (many ? " creates an offer draft for each of them" : " creates an offer draft for them")}
            {pending.effects.createsOffer && pending.effects.sendsAssessment && " and"}
            {pending.effects.sendsAssessment &&
              (many
                ? " emails each of them the assessment for this stage"
                : " emails them the assessment for this stage")}
            . You can&apos;t undo the email.
          </>
        )
      }
      confirmLabel="Move"
      pendingLabel="Moving"
      confirmClassName="bg-theme hover:bg-theme-hover"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
