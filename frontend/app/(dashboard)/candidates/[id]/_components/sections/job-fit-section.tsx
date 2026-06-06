"use client";

import { CandidateJobFitTab } from "@/components/dynamic-imports";

export function JobFitSection({
  resumeUrl,
  cvAnalysis,
}: {
  resumeUrl: string | null;
  cvAnalysis: any;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
          Job Fit Analysis
        </h3>
        <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
          AI-powered match between the candidate&apos;s resume and job
          requirements
        </p>
      </div>
      <CandidateJobFitTab resumeUrl={resumeUrl} cv={cvAnalysis} />
    </div>
  );
}
