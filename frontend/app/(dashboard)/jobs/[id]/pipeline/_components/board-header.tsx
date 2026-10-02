import Link from "next/link";
import { useId } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Job } from "@/types";

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

interface BoardHeaderProps {
  jobId: number;
  job: Pick<Job, "title" | "status" | "employmentType" | "location"> | undefined;
  /** Null while the candidates are still loading. */
  candidateCount: number | null;
  /** How many match the search, or null when no search is active. */
  matchCount: number | null;
  search: string;
  onSearchChange: (value: string) => void;
}

export function BoardHeader({
  jobId,
  job,
  candidateCount,
  matchCount,
  search,
  onSearchChange,
}: BoardHeaderProps) {
  const searchId = useId();
  const published = job?.status === "published";
  return (
    <header className="shrink-0 border-b border-slate-300 bg-white px-4 py-4 sm:px-6 dark:border-neutral-700 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-neutral-100">
              {job?.title ?? "Hiring pipeline"}
            </h1>
            {job && (
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${
                  published
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                {published ? "Published" : job.status}
              </span>
            )}
          </div>
          {job && (
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
              {job.location ? ` · ${job.location}` : ""}
              {candidateCount !== null &&
                (matchCount !== null
                  ? ` · ${matchCount} of ${candidateCount} match`
                  : ` · ${candidateCount} ${candidateCount === 1 ? "candidate" : "candidates"} in process`)}
            </p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-64 max-w-full sm:w-72">
            <HugeiconsIcon
              icon={Search01Icon}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-slate-500 dark:text-neutral-400"
              strokeWidth={2}
            />
            <Input
              id={searchId}
              type="search"
              aria-label="Search candidates"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onSearchChange("");
              }}
              className="h-9 rounded-md border-slate-300 bg-gray-100 pr-9 pl-9 text-sm text-slate-900 shadow-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-400"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="absolute top-1/2 right-2 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        <Button
          nativeButton={false}
          variant="cancel"
          render={<Link href={`/jobs/${jobId}`} />}
          className="h-9 gap-2 px-4 text-sm"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
          Back to job
        </Button>
        </div>
      </div>
    </header>
  );
}
