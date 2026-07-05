import Link from "next/link";
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
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 mb-6">
          Open roles
        </h1>

        {jobs.length === 0 ? (
          <p className="text-[14px] text-slate-500 dark:text-neutral-400 py-8 text-center">
            There are no open positions at the moment. Please check back
            later.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/careers/${job.id}`}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 px-5 py-4 transition-colors hover:bg-slate-200/70 dark:hover:bg-neutral-800"
                >
                  <div className="min-w-0">
                    <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-neutral-100">
                      {job.title}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-slate-500 dark:text-neutral-400">
                      {job.departmentName} ·{" "}
                      {EMPLOYMENT_LABELS[job.employmentType] ??
                        job.employmentType}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#a9c9c4] dark:bg-[#4d625f] px-4 py-1.5 text-[13px] font-semibold text-slate-900 dark:text-neutral-50 transition-colors group-hover:bg-[#98bdb7] dark:group-hover:bg-[#5b7370]">
                    Apply
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
