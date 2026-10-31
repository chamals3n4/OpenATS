import type { Metadata } from "next";
import { CareersHeader, CareersJobsList, pageWidth } from "./_components/careers-jobs-list";
import { getCompanyInfo, getPublishedJobs } from "./_lib/careers-api";
import { careersMetadata } from "./_lib/job-seo";

export async function generateMetadata(): Promise<Metadata> {
  return careersMetadata(await getCompanyInfo());
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
      {jobs.length === 0 ? (
        <>
          <CareersHeader brand={brand} />
          <div className={`${pageWidth} py-16 text-center`}>
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
  );
}
