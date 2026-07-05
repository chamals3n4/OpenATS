"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  Link01Icon,
  Chatting01Icon,
  UserMultiple02Icon,
  RocketIcon,
  PauseIcon,
  StopCircleIcon,
  ArchiveIcon,
  RefreshIcon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      label: "Publish",
      pendingLabel: "Publishing",
      icon: RocketIcon,
      className: "bg-emerald-600 hover:bg-emerald-700",
    },
  ],
  inactive: [
    {
      to: "published",
      label: "Publish",
      pendingLabel: "Publishing",
      icon: RocketIcon,
      className: "bg-emerald-600 hover:bg-emerald-700",
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
      className: "bg-slate-600 hover:bg-slate-700",
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
      className: "bg-emerald-600 hover:bg-emerald-700",
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
    description: `This will hide "${title}" from your public careers page. You can publish it again anytime — nothing is deleted.`,
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

const ACTION_BY_TARGET: Record<JobStatus, StatusAction> = Object.fromEntries(
  Object.values(STATUS_ACTIONS)
    .flat()
    .map((action) => [action.to, action]),
) as Record<JobStatus, StatusAction>;

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
                  <h1 className="truncate text-[22px] font-bold leading-tight text-slate-950 dark:text-neutral-50">
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
                </div>
              </div>

              {/* Second row: salary · candidates · careers link */}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-600 dark:text-neutral-300">
                {salaryStr && (
                  <div className="inline-flex items-center gap-2 font-medium">
                    <span className="size-4 shrink-0 text-slate-400 dark:text-neutral-500">
                      💰
                    </span>
                    <span>{salaryStr}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-2 font-medium">
                  <HugeiconsIcon
                    icon={UserMultiple02Icon}
                    className="size-4 shrink-0 text-slate-400 dark:text-neutral-500"
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
                    className="size-4 shrink-0 text-slate-400 dark:text-neutral-500"
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

          {/* Right: action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {isManager && primaryAction && (
              <Button
                size="sm"
                onClick={() => setPendingStatus(primaryAction.to)}
                className={`h-[34px] cursor-pointer rounded-md border-none px-4 text-[14px] font-semibold leading-none text-white shadow-none ${primaryAction.className}`}
              >
                {primaryAction.label}
              </Button>
            )}
            {isManager && secondaryActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="More status actions"
                  className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-md border-none bg-neutral-700 text-white shadow-none outline-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                >
                  <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {secondaryActions.map((action) => (
                    <DropdownMenuItem
                      key={action.to}
                      onClick={() => setPendingStatus(action.to)}
                    >
                      <HugeiconsIcon icon={action.icon} className="size-4" />
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              size="sm"
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              <HugeiconsIcon
                icon={Chatting01Icon}
                className="size-4"
                strokeWidth={2}
              />
              Discussions
            </Button>
            {isManager ? (
              <Link href={`/jobs/${jobId}/pipeline`}>
                <Button
                  size="sm"
                  className="h-[34px] cursor-pointer rounded-md border-none bg-[var(--theme-color)] px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                >
                  Hiring Pipeline
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4"
                    strokeWidth={3}
                  />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                disabled
                className="h-[34px] rounded-md border-none bg-[var(--theme-color)] px-4 text-[14px] font-semibold leading-none text-white shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hiring Pipeline
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4"
                  strokeWidth={3}
                />
              </Button>
            )}
            <Link href="/jobs">
              <Button
                size="sm"
                className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
              >
                <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Dialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl">
          {confirmCopy && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
                  {confirmCopy.heading}
                </DialogTitle>
                <DialogDescription>{confirmCopy.description}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingStatus(null)}
                  disabled={updateJob.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmStatusChange}
                  disabled={updateJob.isPending}
                  className={`inline-flex items-center gap-2 text-white disabled:opacity-70 disabled:cursor-not-allowed ${
                    pendingStatus ? ACTION_BY_TARGET[pendingStatus].className : ""
                  }`}
                >
                  {updateJob.isPending && <Spinner className="size-3.5" />}
                  {pendingStatus
                    ? updateJob.isPending
                      ? ACTION_BY_TARGET[pendingStatus].pendingLabel
                      : ACTION_BY_TARGET[pendingStatus].label
                    : "Confirm"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
