"use client";

import { useState } from "react";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const DEFAULT_BULK_REJECT_REASON = "Did not meet the requirements";

interface BulkRejectDialogProps {
  open: boolean;
  count: number;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** Rejects the selected candidates with one reason. No email is sent. */
export function BulkRejectDialog({ open, count, isPending, onClose, onConfirm }: BulkRejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[480px] dark:border-neutral-800 dark:bg-neutral-900">
        {open && <Form count={count} isPending={isPending} onClose={onClose} onConfirm={onConfirm} />}
      </DialogContent>
    </Dialog>
  );
}

function Form({ count, isPending, onClose, onConfirm }: Omit<BulkRejectDialogProps, "open">) {
  const [reason, setReason] = useState(DEFAULT_BULK_REJECT_REASON);
  const trimmed = reason.trim();
  const noun = count === 1 ? "candidate" : "candidates";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed && !isPending) onConfirm(trimmed);
      }}
    >
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          Reject {count} {noun}?
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
          They move to Rejected with the reason below. No email is sent, and you can restore any of them
          later.
        </DialogDescription>
      </DialogHeader>
      <div className="px-6 py-5">
        <FormField label="Reason" htmlFor="bulk-reject-reason" required>
          <Input
            id="bulk-reject-reason"
            autoFocus
            value={reason}
            maxLength={255}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
          />
        </FormField>
      </div>
      <DialogFooter className="border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button type="button" variant="cancel" onClick={onClose} disabled={isPending} className="h-9 px-4 text-sm">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={!trimmed || isPending}
          className="h-9 gap-2 px-4 text-sm font-semibold"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? "Rejecting" : `Reject ${noun}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
