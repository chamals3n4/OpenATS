"use client";

import type { JobDetail } from "@/types";

interface OverviewTabProps {
  job: JobDetail | undefined;
  jobLoading: boolean;
}

export function OverviewTab({ job, jobLoading }: OverviewTabProps) {
  if (jobLoading) {
    return (
      <p className="text-slate-400 dark:text-neutral-500 text-[15px]">
        Loading...
      </p>
    );
  }

  if (job?.description) {
    return (
      <div
        className="text-slate-600 dark:text-neutral-300 text-[15px] leading-[1.45] [&_p]:m-0 [&_p+p]:mt-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:m-0 [&_h1+p]:mt-1.5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-800 dark:[&_h2]:text-neutral-100 [&_h2]:m-0 [&_h2+p]:mt-1.5 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-700 dark:[&_h3]:text-neutral-200 [&_h3]:m-0 [&_h3+p]:mt-1"
        dangerouslySetInnerHTML={{ __html: job.description }}
      />
    );
  }

  return (
    <p className="text-slate-400 dark:text-neutral-500 text-[15px]">
      No description provided.
    </p>
  );
}
