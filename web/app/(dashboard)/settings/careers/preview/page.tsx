"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Location01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";

import type { Job } from "@/types";
import { Button } from "@/components/ui/button";

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
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const panel =
  "border border-slate-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-950";

function formatPosted(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CareersPreviewPage() {
  const [jobs, setJobs] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/jobs", {
          headers: { Accept: "application/json" },
        });
        const body = (await res.json().catch(() => ({}))) as {
          data?: unknown;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const list = Array.isArray(body.data) ? (body.data as ListRow[]) : [];
        if (!cancelled) setJobs(list);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950 min-w-0">
      <div className="px-8 py-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
        <Button
          variant="outline"
          className="mb-4 h-10 min-h-10 px-4 gap-2 rounded-md w-full sm:w-fit justify-center text-sm font-medium border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 hover:bg-slate-50 dark:hover:bg-neutral-900 shadow-none"
          render={<Link href="/settings/careers" prefetch />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4 shrink-0" />
          Careers settings
        </Button>
        <h1 className="text-[22px] font-semibold text-slate-900 dark:text-neutral-100 leading-none mb-2">
          Careers preview
        </h1>
        <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-3xl">
          Read-only preview of{" "}
          <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800">
            GET /api/public/jobs
          </code>
          — published jobs only, same shape as the public listing.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 min-w-0">
        <section className={`${panel} p-5`}>
          <h2 className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 uppercase tracking-wide mb-4">
            Job cards
          </h2>
          {loading && (
            <p className="text-sm text-slate-400 dark:text-neutral-500 animate-pulse">
              Loading…
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {!loading && !error && jobs.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              No published jobs returned. Publish a job or check the API.
            </p>
          )}
          {!loading && !error && jobs.length > 0 && (
            <ul className="flex flex-col gap-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/50 px-4 py-3"
                >
                  <p className="font-semibold text-slate-900 dark:text-neutral-100 mb-1.5 text-[15px]">
                    {job.title}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-slate-600 dark:text-neutral-400">
                    <span className="inline-flex items-center gap-1.5">
                      <HugeiconsIcon
                        icon={Briefcase01Icon}
                        className="size-3.5 text-slate-400"
                      />
                      {EMPLOYMENT_LABELS[job.employmentType] ??
                        job.employmentType}
                    </span>
                    {job.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <HugeiconsIcon
                          icon={Location01Icon}
                          className="size-3.5 text-slate-400"
                        />
                        {job.location}
                      </span>
                    ) : null}
                    <span className="text-slate-500 dark:text-neutral-500">
                      {job.departmentName}
                    </span>
                    <span className="text-slate-400 dark:text-neutral-500">
                      Posted {formatPosted(job.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
