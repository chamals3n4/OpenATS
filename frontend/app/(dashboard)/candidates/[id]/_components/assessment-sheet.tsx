"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AssessmentResultsSheetContent } from "./assessment-results-sheet";

interface AssessmentSheetProps {
  attemptId: number | null;
  onClose: () => void;
}

export function AssessmentSheet({ attemptId, onClose }: AssessmentSheetProps) {
  return (
    <Sheet
      open={attemptId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-slate-200 p-0 dark:border-neutral-800 sm:max-w-none lg:w-[min(640px,50vw)] flex flex-col h-full bg-white dark:bg-neutral-900"
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-neutral-800 shrink-0">
          <SheetTitle className="truncate text-sm font-bold text-slate-900 dark:text-neutral-100">
            Assessment Results
          </SheetTitle>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </button>
        </SheetHeader>
        <AssessmentResultsSheetContent attemptId={attemptId} />
      </SheetContent>
    </Sheet>
  );
}
