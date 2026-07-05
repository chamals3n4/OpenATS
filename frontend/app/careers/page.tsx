import type { Job } from "@/types";
import { CareersJobsList } from "./_components/careers-jobs-list";

type CareerJobRow = {
  id: number;
  slug: string;
  title: string;
  employmentType: Job["employmentType"];
  location: string | null;
  departmentName: string;
  createdAt: string;
};

type CompanyInfo = {
  name: string;
  logoUrl: string | null;
  description: string | null;
};

function getApiBase() {
  return (
    process.env.OPENATS_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ""
  ).replace(/\/$/, "");
}

async function getPublishedJobs(): Promise<CareerJobRow[]> {
  const base = getApiBase();
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

async function getCompanyInfo(): Promise<CompanyInfo | null> {
  const base = getApiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/public/company`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: CompanyInfo | null };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export default async function CareersIndexPage() {
  const [jobs, company] = await Promise.all([
    getPublishedJobs(),
    getCompanyInfo(),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-3xl mx-auto px-6 py-14">
        {company && (
          <div className="mb-10 flex flex-col items-center text-center">
            {company.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logoUrl}
                alt={company.name}
                className="mb-4 h-8 w-auto max-w-[160px] object-contain"
              />
            )}
            {company.description && (
              <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
                {company.description}
              </p>
            )}
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100 mb-6">
          Open roles
        </h2>

        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-neutral-400 py-8 text-center">
            There are no open positions at the moment. Please check back
            later.
          </p>
        ) : (
          <CareersJobsList jobs={jobs} />
        )}
      </div>
    </div>
  );
}
