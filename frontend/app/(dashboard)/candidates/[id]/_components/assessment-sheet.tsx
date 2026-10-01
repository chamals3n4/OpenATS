"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAttemptResults } from "@/hooks/queries/use-assessments";
import { AssessmentResultsSheetContent } from "./assessment-results-sheet";

interface AssessmentSheetProps {
  attemptId: number | null;
  onClose: () => void;
}

export function AssessmentSheet({ attemptId, onClose }: AssessmentSheetProps) {
  // Same query key as the content below, so this is one request, not two.
  const { data } = useAttemptResults(attemptId ?? 0, {
    enabled: attemptId !== null,
  });
  const attempt = data?.data?.attempt;

  return (
    <Sheet
      open={attemptId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-full flex-col gap-0 border-slate-300 bg-white p-0 dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-none lg:w-[min(720px,55vw)]"
      >
        <SheetHeader className="flex-row items-start justify-between gap-4 border-b border-slate-300 px-6 py-5 dark:border-neutral-700 shrink-0">
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg font-semibold leading-tight text-slate-900 dark:text-neutral-100">
              {attempt?.assessmentTitle ?? "Assessment answers"}
            </SheetTitle>
            <SheetDescription className="mt-1 truncate text-sm text-slate-600 dark:text-neutral-400">
              {attempt
                ? `${attempt.candidateName} · ${attempt.candidateEmail}`
                : "Loading…"}
            </SheetDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </Button>
        </SheetHeader>
        <AssessmentResultsSheetContent attemptId={attemptId} />
      </SheetContent>
    </Sheet>
  );
}
