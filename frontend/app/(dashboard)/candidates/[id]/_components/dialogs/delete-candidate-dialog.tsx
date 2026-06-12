"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
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

interface DeleteCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  onConfirm: () => void;
}

export function DeleteCandidateDialog({
  open,
  onOpenChange,
  candidate,
  onConfirm,
}: DeleteCandidateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent className="max-w-sm rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-0 overflow-hidden">
        <AlertDialogHeader className="px-6 pt-6 pb-4">
          <div className="size-11 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-3">
            <HugeiconsIcon
              icon={Delete02Icon}
              className="size-5 text-red-500 dark:text-red-400"
            />
          </div>
          <AlertDialogTitle className="text-[17px] font-bold text-slate-900 dark:text-neutral-100">
            Delete candidate?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed mt-1">
            <strong className="text-slate-700 dark:text-neutral-200">
              {candidate?.firstName} {candidate?.lastName}
            </strong>{" "}
            will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-6 pb-6 pt-0 gap-2">
          <AlertDialogCancel className="h-7 rounded-md border-none bg-neutral-800 px-2.5 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-7 rounded-md border-none bg-red-600 px-2.5 text-[13px] font-semibold text-white shadow-none hover:bg-red-500 cursor-pointer"
          >
            Delete Permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
