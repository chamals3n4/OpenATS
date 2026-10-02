"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
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
        // About one A4 (794px) or Legal (816px) page. The sheet sets its own width through the
        // data-side selector, so that is the one that has to be overridden.
        className="gap-0 border-slate-200 p-0 data-[side=right]:w-[min(840px,100vw)] sm:max-w-none dark:border-neutral-800"
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-neutral-800">
          <SheetTitle className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">
            {candidate.firstName} {candidate.lastName} CV
          </SheetTitle>
          <div className="flex shrink-0 items-center gap-2">
          {candidate.resumeUrl && (
            <Button
              render={
                <a
                  href={`/api/candidates/${candidate.id}/resume`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              className="h-9 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              Open in new tab
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            aria-label="Close CV preview"
            title="Close"
            onClick={() => onOpenChange(false)}
            className="size-9 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </Button>
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
