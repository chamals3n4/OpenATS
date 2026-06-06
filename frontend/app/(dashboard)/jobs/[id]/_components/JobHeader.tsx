"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  ArrowRight01Icon,
  Link01Icon,
  Chatting01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { JobDetail } from "@/types";

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
    </div>
  );
}
