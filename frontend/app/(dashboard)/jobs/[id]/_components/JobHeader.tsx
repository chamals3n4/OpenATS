"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight02Icon,
  Cancel01Icon,
  Edit02Icon,
  Link01Icon,
  Chatting01Icon,
  UserMultiple02Icon,
  RocketIcon,
  PauseIcon,
  StopCircleIcon,
  ArchiveIcon,
  RefreshIcon,
  Money02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import type { JobDetail } from "@/types";
import { useIsManager } from "@/hooks/use-role";
import { useUpdateJob } from "@/hooks/queries/use-jobs";

type JobStatus = "draft" | "inactive" | "published" | "closed" | "archived";

interface StatusAction {
  to: JobStatus;
  label: string;
  pendingLabel: string;
  icon: typeof RocketIcon;
  className: string;
}

const STATUS_ACTIONS: Record<JobStatus, StatusAction[]> = {
  draft: [
    {
      to: "published",
      label: "Publish Job",
      pendingLabel: "Publishing",
      icon: RocketIcon,
      className: "bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)]",
    },
  ],
  inactive: [
    {
      to: "published",
      label: "Publish Job",
      pendingLabel: "Publishing",
      icon: RocketIcon,
      className: "bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)]",
    },
    {
      to: "closed",
      label: "Close",
      pendingLabel: "Closing",
      icon: StopCircleIcon,
      className: "bg-red-600 hover:bg-red-700",
    },
  ],
  published: [
    {
      to: "inactive",
      label: "Deactivate",
      pendingLabel: "Deactivating",
      icon: PauseIcon,
      className: "bg-amber-600 hover:bg-amber-700",
    },
    {
      to: "closed",
      label: "Close",
      pendingLabel: "Closing",
      icon: StopCircleIcon,
      className: "bg-red-600 hover:bg-red-700",
    },
  ],
  closed: [
    {
      to: "published",
      label: "Reopen",
      pendingLabel: "Reopening",
      icon: RefreshIcon,
      className: "bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)]",
    },
    {
      to: "archived",
      label: "Archive",
      pendingLabel: "Archiving",
      icon: ArchiveIcon,
      className: "bg-slate-600 hover:bg-slate-700",
    },
  ],
  archived: [
    {
      to: "draft",
      label: "Restore to Draft",
      pendingLabel: "Restoring",
      icon: RefreshIcon,
      className: "bg-slate-600 hover:bg-slate-700",
    },
  ],
};

const STATUS_CONFIRM_COPY: Record<
  JobStatus,
  (title: string) => { heading: string; description: string }
> = {
  published: (title) => ({
    heading: "Publish this job?",
    description: `This will make "${title}" visible on your public careers page and open it up for applications.`,
  }),
  inactive: (title) => ({
    heading: "Deactivate this job?",
    description: `This will hide "${title}" from your public careers page. You can publish it again anytime. Nothing is deleted.`,
  }),
  closed: (title) => ({
    heading: "Close this job?",
    description: `This will close "${title}" and remove it from your public careers page. You can reopen it later if needed.`,
  }),
  archived: (title) => ({
    heading: "Archive this job?",
    description: `This will archive "${title}" and hide it from your active job lists. You can restore it later.`,
  }),
  draft: (title) => ({
    heading: "Restore this job to draft?",
    description: `This will move "${title}" back to draft. It won't be visible publicly until you publish it again.`,
  }),
};

interface JobHeaderProps {
  job: JobDetail | undefined;
  jobLoading: boolean;
  jobCandidateCount: number;
  jobCandidatesPending: boolean;
  salaryStr: string | null;
  isNotesOpen: boolean;
  setIsNotesOpen: (open: boolean) => void;
  jobId: number;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  inactive: {
    label: "Inactive",
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
  published: {
    label: "Active Job",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
  },
  archived: {
    label: "Archived",
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
};

export function JobHeader({
  job,
  jobLoading,
  jobCandidateCount,
  jobCandidatesPending,
  salaryStr,
  isNotesOpen,
  setIsNotesOpen,
  jobId,
}: JobHeaderProps) {
  const isManager = useIsManager();
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null);
  const updateJob = useUpdateJob(jobId);

  const actions = job ? STATUS_ACTIONS[job.status as JobStatus] : undefined;
  const [primaryAction, ...secondaryActions] = actions ?? [];
  const secondaryAction = secondaryActions[0];
  const pendingAction = pendingStatus
    ? actions?.find((action) => action.to === pendingStatus)
    : null;

  const handleConfirmStatusChange = () => {
    if (!pendingStatus) return;
    updateJob.mutate(
      { status: pendingStatus },
      {
        onSuccess: () => {
          toast.success(`Job status updated to "${STATUS_BADGE[pendingStatus]?.label ?? pendingStatus}".`);
          setPendingStatus(null);
        },
        onError: () => {
          toast.error("Failed to update the job status. Please try again.");
        },
      },
    );
  };

  const confirmCopy = pendingStatus
    ? STATUS_CONFIRM_COPY[pendingStatus](job?.title ?? "this job")
    : null;

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: title + meta */}
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  {/* Title + status badge */}
                  <h1 className="truncate text-2xl font-bold leading-tight text-slate-950 dark:text-neutral-50">
                    {jobLoading ? "Loading…" : (job?.title ?? "Job Not Found")}
                  </h1>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                    {job && (
                      <span className="truncate">
                        {EMPLOYMENT_LABELS[job.employmentType] ??
                          job.employmentType}
                        {job.location ? ` · ${job.location}` : ""}
                      </span>
                    )}
                    {job && STATUS_BADGE[job.status] && (
                      <Badge
                        className={`rounded-md border-none px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-none ${STATUS_BADGE[job.status].bg} ${STATUS_BADGE[job.status].text}`}
                      >
                        {STATUS_BADGE[job.status].label}
                      </Badge>
                    )}
                  </div>

                  {job?.skills && job.skills.length > 0 && (
                    <ul
                      aria-label="Required skills"
                      className="mt-3 flex flex-wrap gap-2"
                    >
                      {job.skills.map((skill) => (
                        <li
                          key={skill}
                          className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-[13px] font-medium text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Second row: salary · candidates · careers link */}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-600 dark:text-neutral-300">
                {isManager && (
                  <Link
                    href={`/jobs/${jobId}/pipeline`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-theme/50 bg-theme/15 px-3 text-[13px] font-semibold text-theme transition-colors hover:bg-theme/25 dark:text-primary"
                  >
                    Go to Hiring Pipeline
                    <HugeiconsIcon icon={ArrowRight02Icon} className="size-4" strokeWidth={2} />
                  </Link>
                )}
                {salaryStr && (
                  <div className="inline-flex items-center gap-2 font-medium">
                    <HugeiconsIcon
                      icon={Money02Icon}
                      className="size-5 shrink-0 text-theme dark:text-primary"
                    />
                    <span>{salaryStr}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-2 font-medium">
                  <HugeiconsIcon
                    icon={UserMultiple02Icon}
                    className="size-5 shrink-0 text-theme dark:text-primary"
                  />
                  <span>
                    {jobCandidatesPending ? "…" : jobCandidateCount}{" "}
                    {jobCandidateCount === 1 && !jobCandidatesPending
                      ? "Candidate"
                      : "Candidates"}
                  </span>
                </div>
                <Link
                  href={`/careers/${jobId}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 font-medium hover:text-[var(--theme-color)]"
                >
                  <HugeiconsIcon
                    icon={Link01Icon}
                    className="size-5 shrink-0 text-theme dark:text-primary"
                  />
                  <span className="truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.host}/careers/${jobId}`
                      : `/careers/${jobId}`}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: action buttons, styled like the candidate profile's */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {isManager && primaryAction && (
              <Button
                onClick={() => setPendingStatus(primaryAction.to)}
                className={`h-9 cursor-pointer border-none px-4 text-sm font-semibold text-white shadow-none ${primaryAction.className}`}
              >
                {primaryAction.label}
              </Button>
            )}
            {isManager && secondaryAction && (
              <Button
                variant="outline"
                onClick={() => setPendingStatus(secondaryAction.to)}
                className={`h-9 cursor-pointer px-4 text-sm font-semibold shadow-none ${
                  secondaryAction.to === "closed"
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                    : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                {secondaryAction.label}
              </Button>
            )}

            <Button
              variant="outline"
              aria-pressed={isNotesOpen}
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className={`h-9 cursor-pointer gap-2 px-3.5 text-sm font-semibold shadow-none ${
                isNotesOpen
                  ? "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-200"
                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              }`}
            >
              <HugeiconsIcon icon={Chatting01Icon} className="size-4" strokeWidth={1.75} />
              Discussions
            </Button>

            {isManager && (
              <Link href={`/jobs/${jobId}/edit`}>
                <Button
                  variant="outline"
                  className="h-9 cursor-pointer gap-2 border-theme/30 bg-theme/10 px-3.5 text-sm font-semibold text-theme shadow-none hover:bg-theme/20 dark:text-primary"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
                  Edit
                </Button>
              </Link>
            )}

            <span aria-hidden className="mx-1 hidden h-6 w-px bg-slate-300 lg:block dark:bg-neutral-700" />
            <Link href="/jobs" aria-label="Back to jobs" title="Back to jobs">
              <span className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100">
                <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={pendingStatus !== null}
        title={confirmCopy?.heading ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel={pendingAction?.label ?? "Confirm"}
        pendingLabel={pendingAction?.pendingLabel ?? "Saving"}
        confirmClassName={pendingAction?.className}
        isPending={updateJob.isPending}
        onClose={() => setPendingStatus(null)}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}
