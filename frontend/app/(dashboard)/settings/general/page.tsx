"use client";

import { useCompany } from "@/hooks/queries/use-company";
import { useWorkerStatus } from "@/hooks/queries/use-settings";
import type { Company } from "@/types";
import { CompanyForm } from "./_components/company-form";
import { DepartmentsPanel } from "./_components/departments-panel";
import { AiAnalysisCard } from "./_components/ai-analysis-card";

const NEW_COMPANY: Company = {
  id: 0,
  name: "",
  email: "",
  website: null,
  phone: null,
  address: null,
  description: null,
  logoUrl: null,
  timeZone: "UTC",
  createdAt: "",
  updatedAt: "",
};

export default function SettingsGeneralPage() {
  const {
    data: companyData,
    isPending: companyLoading,
    isError: companyError,
  } = useCompany();
  const company = companyData?.data;
  const { data: workerStatus } = useWorkerStatus();

  return (
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl space-y-6">
          <header>
            <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
              Company Settings
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              Your company profile, the departments you hire for, and AI CV analysis.
            </p>
          </header>

          {workerStatus?.data.status === "missing" && (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20"
            >
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                The background worker is not running
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                CVs are not being read, so new candidates will not appear in CV search, and the
                files of deleted candidates are not erased. Start the worker on the server
                (<code>pnpm start:worker</code> in <code>backend</code>). Nothing is lost: it
                catches up once it is running.
              </p>
            </div>
          )}

          {companyLoading ? (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="h-[520px] animate-pulse rounded-lg border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
              <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
            </div>
          ) : companyError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Could not load settings. Try refreshing the page.
              </p>
            </div>
          ) : (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <CompanyForm
                key={company?.id ?? "new"}
                company={company ?? NEW_COMPANY}
                isNew={!company}
              />
              <div className="space-y-6 xl:sticky xl:top-0">
                <DepartmentsPanel company={company} />
                <AiAnalysisCard />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
