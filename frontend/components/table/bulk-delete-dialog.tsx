"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

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
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
            Delete {subject}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-relaxed text-slate-500 dark:text-neutral-400">
            <strong className="text-slate-700 dark:text-neutral-200">
              {subject}
            </strong>{" "}
            will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={isPending}
            className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-md border-none bg-red-600 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? "Deleting" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
