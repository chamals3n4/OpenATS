import type { Job } from "@/types";

export const EMPLOYMENT_TYPE_LABELS: Record<Job["employmentType"], string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export const STATUS_LABELS: Record<Job["status"], string> = {
  draft: "Draft",
  inactive: "Inactive",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

export const PAY_FREQUENCY_LABELS: Record<string, string> = {
  hourly: "Hourly",
  monthly: "Monthly",
  yearly: "Yearly",
};
