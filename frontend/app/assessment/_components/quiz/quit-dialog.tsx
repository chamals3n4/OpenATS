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
import { ReactNode } from "react";

interface QuitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText: string;
  cancelText: string;
  confirmVariant?: "danger" | "default";
}

export function QuitDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  confirmVariant = "default",
}: QuitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[13px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`h-9 px-5 rounded-lg text-[13px] font-medium shadow-none border-none ${
              confirmVariant === "danger"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
