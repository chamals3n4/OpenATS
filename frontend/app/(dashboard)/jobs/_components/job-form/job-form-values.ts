import type { Job, JobDetail } from "@/types";

export interface JobFormValues {
  title: string;
  departmentId: number | null;
  employmentType: Job["employmentType"] | null;
  skills: string[];
  location: string;
  description: string;
  isSalaryInfoIncluded: boolean;
  salaryType: "range" | "fixed";
  currency: string;
  payFrequency: string;
  salaryMin: string;
  salaryMax: string;
  salaryFixed: string;
  /** Edit mode only: whether the job should be published. */
  isActive: boolean;
}

/** Form values once the required fields are known to be filled in. */
export type ValidJobFormValues = JobFormValues & {
  departmentId: number;
  employmentType: Job["employmentType"];
};

export const EMPTY_JOB_FORM_VALUES: JobFormValues = {
  title: "",
  departmentId: null,
  employmentType: null,
  skills: [],
  location: "",
  description: "",
  isSalaryInfoIncluded: true,
  salaryType: "range",
  currency: "USD",
  payFrequency: "yearly",
  salaryMin: "",
  salaryMax: "",
  salaryFixed: "",
  isActive: false,
};

export function jobToFormValues(job: JobDetail): JobFormValues {
  return {
    title: job.title ?? "",
    departmentId: job.departmentId ?? null,
    employmentType: job.employmentType ?? null,
    skills: job.skills ?? [],
    location: job.location ?? "",
    description: job.description ?? "",
    isSalaryInfoIncluded: Boolean(job.salaryType),
    salaryType: job.salaryType === "fixed" ? "fixed" : "range",
    currency: job.currency ?? "USD",
    payFrequency: job.payFrequency ?? "yearly",
    salaryMin: job.salaryMin ? String(job.salaryMin) : "",
    salaryMax: job.salaryMax ? String(job.salaryMax) : "",
    salaryFixed: job.salaryFixed ? String(job.salaryFixed) : "",
    isActive: job.status === "published",
  };
}

export function isValidJobForm(v: JobFormValues): v is ValidJobFormValues {
  return Boolean(v.title.trim() && v.departmentId && v.employmentType);
}
