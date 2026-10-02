"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Briefcase01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import type { Job } from "@/types";

type ListRow = {
  id: number;
  slug: string;
  title: string;
  employmentType: Job["employmentType"];
  location: string | null;
  departmentName: string;
  createdAt: string;
};

const EMPLOYMENT_LABELS: Record<Job["employmentType"], string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

function formatPosted(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** The raw data the public API returns, as a read-only list for managers. */
export default function CareersPreviewPage() {
  const [jobs, setJobs] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/jobs", { headers: { Accept: "application/json" } });
        const body = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (!cancelled) setJobs(Array.isArray(body.data) ? (body.data as ListRow[]) : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-4xl space-y-6">
          <header>
            <Link
              href="/settings/careers-page"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
              Careers page settings
            </Link>
            <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
              Public job data
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              The published jobs your careers page and the API return, exactly as the public sees them.
            </p>
          </header>

          <section className="rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            {loading ? (
              <div className="space-y-px">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-slate-100 first:rounded-t-lg last:rounded-b-lg dark:bg-neutral-800" />
                ))}
              </div>
            ) : error ? (
              <p role="alert" className="px-5 py-4 text-sm font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            ) : jobs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-600 dark:text-neutral-400">
                No published jobs yet. Publish a job and it will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-300 dark:divide-neutral-700">
                {jobs.map((job) => (
                  <li key={job.id} className="px-5 py-4">
                    <p className="text-[15px] font-medium text-slate-900 dark:text-neutral-100">{job.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon icon={Briefcase01Icon} className="size-4" strokeWidth={1.75} />
                        {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
                      </span>
                      {job.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <HugeiconsIcon icon={Location01Icon} className="size-4" strokeWidth={1.75} />
                          {job.location}
                        </span>
                      )}
                      <span>{job.departmentName}</span>
                      <span>Posted {formatPosted(job.createdAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
