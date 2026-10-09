"use client";

import { CandidateJobFitTab } from "@/components/dynamic-imports";
import type { CandidateCvAnalysisPayload } from "@/types";

export function JobFitSection({
  resumeUrl,
  cvAnalysis,
}: {
  resumeUrl: string | null;
  cvAnalysis: CandidateCvAnalysisPayload | null;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Job Fit Analysis
        </h3>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
          How well the candidate&apos;s resume matches this job
        </p>
      </div>
      <CandidateJobFitTab resumeUrl={resumeUrl} cv={cvAnalysis} />
    </div>
  );
}
