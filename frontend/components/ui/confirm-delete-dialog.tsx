"use client";

import * as React from "react";

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
import { cn } from "@/lib/utils";

type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  isPending?: boolean;
  /** Button label, e.g. "Delete" or "Remove". The pending label is derived from it. */
  confirmLabel?: string;
  pendingLabel?: string;
  /** Overrides the confirm button colors, for non-delete actions such as publishing. */
  confirmClassName?: string;
  onClose: () => void;
  onConfirm: () => void;
};

/** Emphasised name inside a confirm-dialog description. */
export function ConfirmDeleteName({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold text-slate-800 dark:text-neutral-100">
      {children}
    </strong>
  );
}

/** The one delete confirmation used across the app, so every page looks and behaves the same. */
export function ConfirmDeleteDialog({
  open,
  title,
  description,
  isPending = false,
  confirmLabel = "Delete",
  pendingLabel,
  confirmClassName,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={isPending}
            className="h-9 px-4 text-sm leading-none"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className={cn(
              "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border-none bg-red-600 px-4 text-sm font-medium leading-none text-white shadow-none hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70",
              confirmClassName,
            )}
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? (pendingLabel ?? `${confirmLabel.replace(/e$/, "")}ing`) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
