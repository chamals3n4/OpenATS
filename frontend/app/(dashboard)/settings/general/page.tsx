"use client";

import { useCompany } from "@/hooks/queries/use-company";
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
