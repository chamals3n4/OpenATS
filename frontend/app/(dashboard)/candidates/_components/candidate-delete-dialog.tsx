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
    <AlertDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
            Delete this candidate?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400 leading-relaxed">
            <strong className="text-slate-700 dark:text-neutral-200">
              {candidate?.firstName} {candidate?.lastName}
            </strong>{" "}
            will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel variant="ghost" className="h-9 cursor-pointer rounded-md border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-[34px] rounded-md border-none bg-red-600 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? "Deleting" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
