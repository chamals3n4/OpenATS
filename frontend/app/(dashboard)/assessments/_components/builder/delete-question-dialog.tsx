"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { Question } from "../../_lib/assessment-builder-types";

/** Confirm before deleting a question */
export function DeleteQuestionDialog({
  question,
  number,
  onCancel,
  onConfirm,
}: {
  /** Question to delete, or null */
  question: Question | null;
  number: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = question?.title.trim();

  return (
    <ConfirmDeleteDialog
      open={question !== null}
      title={`Delete question ${number}?`}
      description={
        <>
          {title ? (
            <>
              <ConfirmDeleteName>{title}</ConfirmDeleteName> and its answers
            </>
          ) : (
            "This question and its answers"
          )}{" "}
          will be removed from the assessment. Nothing is deleted for good until you save.
        </>
      }
      onClose={onCancel}
      onConfirm={onConfirm}
    />
  );
}
