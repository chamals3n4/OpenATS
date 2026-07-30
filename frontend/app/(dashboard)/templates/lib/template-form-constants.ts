export const INPUT_CLASS =
  "h-8 bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 text-slate-900 dark:text-neutral-100 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0";

export const TEXTAREA_CLASS =
  "w-full bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 resize-none focus-visible:ring-0 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus:outline-none";

export const LABEL_CLASS =
  "text-xs font-medium text-slate-500 dark:text-neutral-400";

// Keep in sync with backend/src/services/variable.service.ts
export const VARS = [
  "candidate_name",
  "job_title",
  "company_name",
  "start_date",
  "salary",
  "currency",
  "employment_type",
  "reporting_manager",
  "benefits",
  "offer_review_url",
];

export const SAMPLE: Record<string, string> = {
  candidate_name: "Alex Johnson",
  job_title: "Senior Software Engineer",
  company_name: "OpenATS Inc.",
  start_date: "August 18, 2026",
  salary: "120,000",
  currency: "USD",
  employment_type: "Full-time",
  reporting_manager: "Jamie Rivera",
  benefits: "Health insurance, 401(k) match, unlimited PTO",
  offer_review_url: "https://app.openats.dev/offers/preview-token",
};
