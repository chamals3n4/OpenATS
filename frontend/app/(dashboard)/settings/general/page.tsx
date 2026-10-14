"use client";

import { useState } from "react";
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
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  return (
    // Full height with its own scroll
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 flex-col bg-white dark:bg-neutral-950">
      {/* Keep the title and buttons visible */}
      <div className="shrink-0 px-4 sm:px-8">
        <div className="max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-300 py-6 dark:border-neutral-700">
            <div className="min-w-0">
              <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
                Company settings
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                Your company profile, the departments you hire for, and AI CV analysis.
              </p>
            </div>
            {/* The profile form puts its save and cancel buttons here. */}
            <div ref={setActionsSlot} className="shrink-0" />
          </header>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
        <div className="max-w-7xl pb-16">

          {workerStatus?.data.status === "missing" && (
            <div
              role="alert"
              className="mt-6 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 dark:bg-amber-950/20"
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
            <div className="grid gap-x-10 py-6 xl:grid-cols-[minmax(0,1fr)_400px]" aria-label="Loading settings">
              <div className="space-y-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-md bg-slate-100 dark:bg-neutral-800" />
                ))}
              </div>
              <div className="mt-6 h-64 animate-pulse rounded-md bg-slate-100 xl:mt-0 dark:bg-neutral-800" />
            </div>
          ) : companyError ? (
            <p role="alert" className="py-8 text-sm font-medium text-red-700 dark:text-red-400">
              Could not load settings. Try refreshing the page.
            </p>
          ) : (
            // Departments and AI stay visible while the profile scrolls
            <div className="grid items-start gap-x-10 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="min-w-0">
                <CompanyForm
                  key={company?.id ?? "new"}
                  company={company ?? NEW_COMPANY}
                  isNew={!company}
                  actionsSlot={actionsSlot}
                />
              </div>
              <aside className="border-t border-slate-300 xl:sticky xl:top-0 xl:border-t-0 xl:border-l xl:pl-10 dark:border-neutral-700">
                <DepartmentsPanel company={company} />
                <AiAnalysisCard />
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
