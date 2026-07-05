import type { Job } from "@/types";

export type CreateJobPayload = Pick<
  Job,
  | "title"
  | "departmentId"
  | "employmentType"
  | "skills"
  | "salaryType"
  | "currency"
  | "payFrequency"
  | "status"
> & {
  location?: string;
  description?: string;
  salaryFixed?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
};

interface BuildJobPayloadParams {
  title: string;
  departmentId: number;
  employmentType: Job["employmentType"];
  location: string;
  description: string;
  skills: string[];
  isSalaryInfoIncluded: boolean;
  salaryType: "range" | "fixed";
  currency: string;
  payFrequency: string;
  salaryMin: string;
  salaryMax: string;
  salaryFixed: string;
}

export function buildJobPayload(
  params: BuildJobPayloadParams,
): CreateJobPayload {
  const {
    title,
    departmentId,
    employmentType,
    location,
    description,
    skills,
    isSalaryInfoIncluded,
    salaryType,
    currency,
    payFrequency,
    salaryMin,
    salaryMax,
    salaryFixed,
  } = params;

  const salaryPayload = (() => {
    if (!isSalaryInfoIncluded) {
      return {
        salaryType: null,
        currency: null,
        payFrequency: null,
        salaryFixed: null,
        salaryMin: null,
        salaryMax: null,
      };
    }

    if (salaryType === "fixed" && salaryFixed) {
      return {
        salaryType: "fixed" as const,
        currency,
        payFrequency,
        salaryFixed: parseFloat(salaryFixed.replace(/,/g, "")) || null,
        salaryMin: null,
        salaryMax: null,
      };
    }

    if (salaryType === "range" && salaryMin && salaryMax) {
      return {
        salaryType: "range" as const,
        currency,
        payFrequency,
        salaryFixed: null,
        salaryMin: parseFloat(salaryMin.replace(/,/g, "")) || null,
        salaryMax: parseFloat(salaryMax.replace(/,/g, "")) || null,
      };
    }

    return {
      salaryType: null,
      currency: null,
      payFrequency: null,
      salaryFixed: null,
      salaryMin: null,
      salaryMax: null,
    };
  })();

  return {
    title: title.trim(),
    departmentId,
    employmentType,
    location: location || undefined,
    description: description || undefined,
    skills: skills.length > 0 ? skills : [],
    status: "draft",
    ...salaryPayload,
  };
}
