"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { InterviewCard } from "../interview-card";
import type { useDeleteInterview } from "@/hooks/queries/use-interviews";
import type { CandidateDetail } from "@/types";

interface InterviewsSectionProps {
  candidate: CandidateDetail;
  stageMap: Record<number, string>;
  deleteInterviewMutation: ReturnType<typeof useDeleteInterview>;
  onSchedule: () => void;
}

export function InterviewsSection({
  candidate,
  stageMap,
  deleteInterviewMutation,
  onSchedule,
}: InterviewsSectionProps) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Interview Log
          </h3>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Schedule and track interview outcomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onSchedule}
            className="h-7 rounded-md border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)]"
          >
            Schedule
          </Button>
        </div>
      </div>

      {(candidate.interviews ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
            <HugeiconsIcon
              icon={Calendar02Icon}
              className="size-5 text-slate-300 dark:text-neutral-600"
            />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-neutral-400">
            No interviews yet
          </p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
            Click &quot;Schedule&quot; to invite a candidate.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(candidate.interviews ?? []).map((iv) => (
            <InterviewCard
              key={iv.id}
              interview={iv}
              stageMap={stageMap}
              deleteInterviewMutation={deleteInterviewMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
