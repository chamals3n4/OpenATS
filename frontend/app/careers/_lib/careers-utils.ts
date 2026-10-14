import type { Job } from "@/types";

export type CareerJobRow = {
  id: number;
  slug: string;
  title: string;
  employmentType: Job["employmentType"];
  location: string | null;
  departmentName: string;
  createdAt: string;
};

export const EMPLOYMENT_LABELS: Record<Job["employmentType"], string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export function employmentLabel(type: Job["employmentType"]) {
  return EMPLOYMENT_LABELS[type] ?? type;
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Posted today", "Posted 3 days ago", "Posted 2 weeks ago", then the date once it is old news. */
export function postedLabel(createdAt: string, now: number): string | null {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;

  const days = Math.round((startOfDay(now) - startOfDay(created)) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Posted ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  return `Posted ${new Date(created).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export const ALL = "all";

export interface JobFilters {
  search: string;
  department: string;
  employmentType: string;
  location: string;
}

export const NO_FILTERS: JobFilters = {
  search: "",
  department: ALL,
  employmentType: ALL,
  location: ALL,
};

export function hasActiveFilters(filters: JobFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.department !== ALL ||
    filters.employmentType !== ALL ||
    filters.location !== ALL
  );
}

export function filterJobs(jobs: CareerJobRow[], filters: JobFilters) {
  const q = filters.search.trim().toLowerCase();
  return jobs.filter((job) => {
    const matchesSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      (job.location ?? "").toLowerCase().includes(q) ||
      job.departmentName.toLowerCase().includes(q) ||
      employmentLabel(job.employmentType).toLowerCase().includes(q);
    return (
      matchesSearch &&
      (filters.department === ALL || job.departmentName === filters.department) &&
      (filters.employmentType === ALL || job.employmentType === filters.employmentType) &&
      (filters.location === ALL || job.location === filters.location)
    );
  });
}

export interface DepartmentGroup {
  department: string;
  jobs: CareerJobRow[];
}

/** Departments A to Z; inside each, the newest role first. */
export function groupByDepartment(jobs: CareerJobRow[]): DepartmentGroup[] {
  const groups = new Map<string, CareerJobRow[]>();
  for (const job of jobs) {
    const list = groups.get(job.departmentName) ?? [];
    list.push(job);
    groups.set(job.departmentName, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([department, list]) => ({
      department,
      jobs: [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id,
      ),
    }));
}

export function departmentNames(jobs: CareerJobRow[]) {
  return [...new Set(jobs.map((j) => j.departmentName))].sort((a, b) => a.localeCompare(b));
}

/** The job types that actually exist, in the order people expect rather than alphabetically. */
export function employmentTypesIn(jobs: CareerJobRow[]): Job["employmentType"][] {
  const order = Object.keys(EMPLOYMENT_LABELS) as Job["employmentType"][];
  const present = new Set(jobs.map((j) => j.employmentType));
  return order.filter((type) => present.has(type));
}

export function locationsIn(jobs: CareerJobRow[]) {
  return [...new Set(jobs.map((j) => j.location).filter((l): l is string => Boolean(l)))].sort(
    (a, b) => a.localeCompare(b),
  );
}
