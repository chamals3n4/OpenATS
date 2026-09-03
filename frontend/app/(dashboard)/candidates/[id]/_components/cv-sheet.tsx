"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, File01Icon } from "@hugeicons/core-free-icons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ResumeScrollView } from "./resume-scroll-view";
import type { CandidateDetail } from "@/types";

interface CvSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateDetail;
}

export function CvSheet({ open, onOpenChange, candidate }: CvSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-slate-200 p-0 dark:border-neutral-800 sm:max-w-none lg:w-[min(920px,72vw)]"
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-neutral-800">
          <SheetTitle className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">
            {candidate.firstName} {candidate.lastName} CV
          </SheetTitle>
          <div className="flex shrink-0 items-center gap-2">
            {candidate.resumeUrl && (
              <a
                href={`/api/candidates/${candidate.id}/resume`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--theme-color)] px-3 text-sm font-semibold text-white hover:bg-[var(--theme-color-hover)]"
              >
                Open in New Tab
              </a>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="Collapse CV preview"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </button>
          </div>
        </SheetHeader>
        {candidate.resumeUrl ? (
          <ResumeScrollView candidateId={candidate.id} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-800">
              <HugeiconsIcon
                icon={File01Icon}
                className="size-6 text-slate-400 dark:text-neutral-600"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
                No CV uploaded
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">
                Upload a PDF from edit candidate.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
