"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import type { Question } from "../../_lib/assessment-builder-types";

/**
 * Asks before a question is removed. Deleting is one click on a small button, and a question
 * with its options and correct answers takes a while to write again.
 */
export function DeleteQuestionDialog({
  question,
  number,
  onCancel,
  onConfirm,
}: {
  /** The question waiting to be deleted, or null when nothing is. */
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
