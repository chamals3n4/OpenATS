import { CareersHeader, CareersJobsList } from "./_components/careers-jobs-list";
import type { CareerJobRow } from "./_lib/careers-utils";

type CompanyInfo = {
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
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
  const brand = company
    ? {
        name: company.name,
        logoUrl: company.logoUrl,
        description: company.description,
        website: company.website,
      }
    : null;

  return (
    <div className="min-h-screen bg-white transition-colors duration-300 dark:bg-neutral-950">
      <div className="mx-auto max-w-[960px] px-6 pb-24 pt-10 sm:px-8">
        {jobs.length === 0 ? (
          <>
            <CareersHeader brand={brand} />
            <div className="mt-10 rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center dark:border-neutral-700">
              <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
                No open roles right now
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                New roles are posted here as they open. Please check back soon.
              </p>
            </div>
          </>
        ) : (
          <CareersJobsList jobs={jobs} brand={brand} />
        )}
      </div>
    </div>
  );
}
