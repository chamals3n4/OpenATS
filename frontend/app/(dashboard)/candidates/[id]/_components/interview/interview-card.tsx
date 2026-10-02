"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  Message02Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import { useInterviewFeedback } from "@/hooks/queries/use-interview-feedback";
import type { useDeleteInterview } from "@/hooks/queries/use-interviews";
import {
  OUTCOME_CONFIG,
  STATUS_CONFIG,
} from "@/app/(dashboard)/interviews/_components/constants";
import {
  eventTypeLabel,
  formatInterviewTime,
  isUpcoming,
  meetingProvider,
  relativeDay,
  safeMeetingUrl,
} from "../../lib/interview-utils";
import { InterviewFeedbackDialog } from "./interview-feedback-dialog";
import type { CandidateInterview } from "@/types";

interface InterviewCardProps {
  interview: CandidateInterview;
  stageName: string | null;
  now: number;
  deleteInterviewMutation: ReturnType<typeof useDeleteInterview>;
}

function Fact({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[15px] font-medium text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
      {sub && (
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          {sub}
        </p>
      )}
    </div>
  );
}

export function InterviewCard({
  interview,
  stageName,
  now,
  deleteInterviewMutation,
}: InterviewCardProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Fetched up front so the button can show how many notes there already are.
  const { data: feedbackData } = useInterviewFeedback(interview.id);
  const feedbackCount = feedbackData?.data?.length ?? 0;

  const name = interview.eventName ?? stageName ?? `Interview #${interview.id}`;
  const status = STATUS_CONFIG[interview.status] ?? STATUS_CONFIG.pending_schedule;
  const outcome =
    interview.outcome && interview.outcome !== "pending"
      ? OUTCOME_CONFIG[interview.outcome]
      : null;
  const upcoming = isUpcoming(interview, now);
  const meetingUrl = safeMeetingUrl(interview.meetingUrl);
  const isVirtual = (interview.eventType ?? "virtual") === "virtual";
  const proposedSlots = (interview.timeSlots ?? []).filter((s) => s.datetime);
  const awaitingSlot = interview.status === "pending_schedule";

  return (
    <article className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
            {name}
          </h4>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            {[stageName, eventTypeLabel(interview.eventType)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}
          >
            <span className={`size-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          {outcome && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${outcome.badge}`}
            >
              {outcome.label}
            </span>
          )}
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3">
        <Fact
          label="When"
          sub={interview.scheduledAt ? relativeDay(interview.scheduledAt, now) : null}
        >
          {interview.scheduledAt ? (
            formatInterviewTime(interview.scheduledAt)
          ) : (
            <span className="text-slate-500 dark:text-neutral-400">
              Not scheduled yet
            </span>
          )}
        </Fact>
        <Fact label="Format">
          {isVirtual ? (
            meetingUrl ? (
              meetingProvider(meetingUrl)
            ) : (
              <span className="text-slate-500 dark:text-neutral-400">
                No meeting link yet
              </span>
            )
          ) : (
            "On site"
          )}
        </Fact>
        {interview.durationMinutes ? (
          <Fact label="Duration">{interview.durationMinutes} minutes</Fact>
        ) : null}
      </dl>

      {awaitingSlot && proposedSlots.length > 0 && (
        <div className="border-t border-slate-300 px-5 py-4 dark:border-neutral-700">
          <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
            Waiting for the candidate to choose a time
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {proposedSlots.map((slot) => (
              <li
                key={slot.datetime}
                className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                {formatInterviewTime(slot.datetime)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {interview.notes && (
        <div className="border-t border-slate-300 px-5 py-4 dark:border-neutral-700">
          <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
            {interview.notes}
          </p>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 px-5 py-3 dark:border-neutral-700">
        <Button
          variant="cancel"
          onClick={() => setFeedbackOpen(true)}
          className="h-9 gap-2 px-3.5 text-sm"
        >
          <HugeiconsIcon icon={Message02Icon} className="size-4" strokeWidth={1.75} />
          {feedbackCount > 0 ? `Feedback (${feedbackCount})` : "Add feedback"}
        </Button>

        <div className="flex items-center gap-2">
          {upcoming && meetingUrl && interview.status === "scheduled" && (
            <Button
              render={<a href={meetingUrl} target="_blank" rel="noopener noreferrer" />}
              className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              <HugeiconsIcon icon={Video01Icon} className="size-4" strokeWidth={1.75} />
              Join meeting
            </Button>
          )}
          <Button
            variant="ghost"
            aria-label={`Delete ${name}`}
            title="Delete interview"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteInterviewMutation.isPending}
            className="size-9 rounded-md p-0 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </footer>

      <InterviewFeedbackDialog
        interviewId={interview.id}
        interviewName={name}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        title="Delete this interview?"
        description={
          <>
            <ConfirmDeleteName>{name}</ConfirmDeleteName> will be permanently
            deleted. This cannot be undone.
          </>
        }
        isPending={deleteInterviewMutation.isPending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() =>
          deleteInterviewMutation.mutate(interview.id, {
            onSettled: () => setDeleteOpen(false),
          })
        }
      />
    </article>
  );
}
