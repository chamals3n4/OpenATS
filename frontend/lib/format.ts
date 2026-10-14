import type { JobDetail } from "@/types";

// Shared formats for the dashboard, so a date reads the same on every page

/** e.g. "5m ago", "3h ago", "2d ago" */
export function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** e.g. "Oct 14, 2026", or a dash when there is no date */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** e.g. "Oct 14, 2026, 2:30 PM" */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "2:30 PM", or empty when there is no time */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** e.g. "LKR 100,000 – 150,000/monthly", or null when the job has no salary */
export function formatSalary(job: JobDetail): string | null {
  if (!job.salaryType) return null;
  const fmt = (n: string | null) => (n ? Number(n).toLocaleString() : "");
  const freq = job.payFrequency ? `/${job.payFrequency}` : "";
  if (job.salaryType === "fixed") return `${job.currency} ${fmt(job.salaryFixed)}${freq}`;
  return `${job.currency} ${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}${freq}`;
}
