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
import type { Offer } from "@/types";
import { getCandidateName } from "../lib/offer-utils";

interface OfferDeleteDialogProps {
  offer: Offer | null;
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
  const candidateName = offer ? getCandidateName(offer as any) : "";

  return (
    <AlertDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Delete this offer?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
            The offer for{" "}
            <strong className="text-slate-700 dark:text-neutral-200">
              {candidateName}
            </strong>{" "}
            will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-8 rounded-md border-none bg-neutral-700 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="h-8 rounded-md border-none bg-red-600 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? "Deleting" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
