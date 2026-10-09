"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CoPresentIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { useDeleteInterview } from "@/hooks/queries/use-interviews";
import { groupInterviews } from "../../lib/interview-utils";
import { InterviewCard } from "../interview/interview-card";
import type { CandidateDetail, CandidateInterview } from "@/types";

interface InterviewsSectionProps {
  candidate: CandidateDetail;
  stageMap: Record<number, string>;
  deleteInterviewMutation: ReturnType<typeof useDeleteInterview>;
  onSchedule: () => void;
}

function ScheduleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
    >
      <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
      Schedule interview
    </Button>
  );
}

export function InterviewsSection({
  candidate,
  stageMap,
  deleteInterviewMutation,
  onSchedule,
}: InterviewsSectionProps) {
  const [now] = useState(() => Date.now());
  const interviews = useMemo(() => candidate.interviews ?? [], [candidate.interviews]);
  const { upcoming, past } = useMemo(
    () => groupInterviews(interviews, now),
    [interviews, now],
  );

  const renderGroup = (title: string, items: CandidateInterview[]) =>
    items.length > 0 && (
      <section aria-label={title}>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-neutral-100">
          {title}
          <span className="text-slate-500 dark:text-neutral-400">
            {items.length}
          </span>
        </h4>
        <div className="space-y-4">
          {items.map((iv) => (
            <InterviewCard
              key={iv.id}
              interview={iv}
              stageName={stageMap[iv.stageId] ?? null}
              now={now}
              deleteInterviewMutation={deleteInterviewMutation}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Interview Log
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Schedule and track interview outcomes
          </p>
        </div>
        {interviews.length > 0 && <ScheduleButton onClick={onSchedule} />}
      </div>

      {interviews.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={CoPresentIcon}
              className="size-5 text-slate-400 dark:text-neutral-500"
            />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            No interviews yet
          </p>
          <p className="mx-auto mt-1 max-w-[320px] text-sm text-slate-500 dark:text-neutral-400">
            Invite {candidate.firstName} to pick a time, or book one directly.
          </p>
          <div className="mt-4 flex justify-center">
            <ScheduleButton onClick={onSchedule} />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {renderGroup("Upcoming", upcoming)}
          {renderGroup("Past", past)}
        </div>
      )}
    </div>
  );
}
