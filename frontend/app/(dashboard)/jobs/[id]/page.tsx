"use client";

import { useEffect, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { serverFetch } from "@/lib/server-fetch";
import { Tabs } from "@/components/ui/tabs";

import { JobHeader } from "./_components/job-header";
import { JobTabs } from "./_components/job-tabs";
import { JobSetupAlert } from "./_components/job-setup-alert";
import { DiscussionsPanel } from "./_components/discussions-panel";

import { useJob } from "@/hooks/queries/use-jobs";
import { useCandidates } from "@/hooks/queries/use-candidates";

import { formatSalary } from "@/lib/format";

const JOB_TABS = [
  { value: "overview", label: "Overview" },
  { value: "hiring-team", label: "Hiring Team" },
  { value: "hiring-process", label: "Hiring Process" },
  { value: "custom-questions", label: "Custom Questions" },
  { value: "assessments", label: "Assessments" },
  { value: "scoring", label: "Scoring" },
];

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = Number(params.id);
  const queryClient = useQueryClient();
  const router = useRouter();
  // New jobs come with ?setup=1 to show the setup alert
  const showSetupAlert = useSearchParams().get("setup") === "1";
  const dismissSetupAlert = () => router.replace(`/jobs/${jobId}`, { scroll: false });

  // Prefetch the tabs' job data so switching tabs is instant
  useEffect(() => {
    if (!jobId) return;
    const prefetch = (key: QueryKey, url: string, staleTime: number) => {
      void queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => serverFetch(url),
        staleTime,
      });
    };

    prefetch(
      ["jobs", jobId, "pipeline"],
      `/jobs/${jobId}/pipeline`,
      1000 * 60 * 3,
    );
    prefetch(
      ["candidates", jobId, undefined],
      `/candidates/jobs/${jobId}`,
      1000 * 30,
    );
    prefetch(["jobs", jobId, "team"], `/jobs/${jobId}/team`, 1000 * 60 * 5);
    prefetch(
      ["jobs", jobId, "questions"],
      `/jobs/${jobId}/questions`,
      1000 * 60 * 5,
    );
    prefetch(
      ["jobs", jobId, "assessments"],
      `/jobs/${jobId}/assessments`,
      1000 * 60 * 5,
    );
  }, [jobId, queryClient]);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [activeJobTab, setActiveJobTab] = useState("overview");

  const { data: jobData, isLoading: jobLoading } = useJob(jobId);
  const { data: jobCandidatesData, isPending: jobCandidatesPending } =
    useCandidates(jobId, undefined, {
      enabled: Number.isFinite(jobId) && jobId > 0,
    });
  const jobCandidateCount = jobCandidatesData?.data?.length ?? 0;
  const job = jobData?.data;
  const salaryStr = job ? formatSalary(job) : null;

  return (
    // Job and discussion side by side, each scrolls
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <JobHeader
        job={job}
        jobLoading={jobLoading}
        jobCandidateCount={jobCandidateCount}
        jobCandidatesPending={jobCandidatesPending}
        salaryStr={salaryStr}
        isNotesOpen={isNotesOpen}
        setIsNotesOpen={setIsNotesOpen}
        jobId={jobId}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          <main className="min-w-0">
            <Tabs
              value={activeJobTab}
              onValueChange={setActiveJobTab}
              className="w-full"
            >
              <div className="mb-4">
                <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-300 bg-transparent p-1 shadow-none dark:border-neutral-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {JOB_TABS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setActiveJobTab(value)}
                      className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium leading-none transition-colors ${
                        activeJobTab === value
                          ? "border-none bg-[var(--theme-color)] text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                          : "border-none bg-slate-200/70 text-slate-800 hover:bg-slate-200 hover:text-slate-950 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {showSetupAlert && (
                <JobSetupAlert
                  onAddQuestions={() => {
                    setActiveJobTab("custom-questions");
                    dismissSetupAlert();
                  }}
                  onSetUpScoring={() => {
                    setActiveJobTab("scoring");
                    dismissSetupAlert();
                  }}
                  onDismiss={dismissSetupAlert}
                />
              )}

              <JobTabs jobId={jobId} job={job} jobLoading={jobLoading} />
            </Tabs>
          </main>
        </div>
      </div>

      </div>

      {isNotesOpen && <DiscussionsPanel jobId={jobId} onClose={() => setIsNotesOpen(false)} />}
    </div>
  );
}
