import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Location01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

import type { Job } from "@/types";

type CareerJobRow = {
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

async function getPublishedJobs(): Promise<CareerJobRow[]> {
  const base = (
    process.env.OPENATS_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ""
  ).replace(/\/$/, "");

  if (!base) return [];

  try {
    const res = await fetch(`${base}/public/jobs`, { cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: unknown };
    return Array.isArray(body.data) ? (body.data as CareerJobRow[]) : [];
  } catch {
    return [];
  }
}

export default async function CareersIndexPage() {
  const jobs = await getPublishedJobs();

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-6xl mx-auto pt-16 pb-24 px-6 sm:px-10 lg:px-12">
        <h1 className="text-left text-3xl sm:text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-tight mb-3">
          Available positions
        </h1>
        <p className="text-left text-[15px] text-slate-500 dark:text-neutral-400 mb-12 max-w-3xl">
          Browse open roles and apply in a few minutes. We review every
          application carefully.
        </p>

        {jobs.length === 0 ? (
          <p className="text-slate-500 dark:text-neutral-400 text-[15px]">
            There are no open positions at the moment. Please check back later.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/careers/${job.id}`}
                  className="group block rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-6 py-5 shadow-sm hover:border-slate-300 dark:hover:border-neutral-700 hover:shadow transition-[border-color,box-shadow] duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 transition-colors">
                        {job.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-slate-500 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-2">
                          <HugeiconsIcon
                            icon={Briefcase01Icon}
                            className="size-[17px] text-slate-400 dark:text-neutral-500 shrink-0"
                          />
                          <span className="font-medium">
                            {EMPLOYMENT_LABELS[job.employmentType] ??
                              job.employmentType}
                          </span>
                        </span>
                        {job.location ? (
                          <span className="inline-flex items-center gap-2">
                            <HugeiconsIcon
                              icon={Location01Icon}
                              className="size-[17px] text-slate-400 dark:text-neutral-500 shrink-0"
                            />
                            <span className="font-medium">{job.location}</span>
                          </span>
                        ) : null}
                        <span className="text-slate-400 dark:text-neutral-500">
                          {job.departmentName}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-theme shrink-0 sm:pt-0.5">
                      Apply
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
