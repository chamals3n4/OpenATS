import { cache } from "react";
import type { CustomQuestion, JobDetail } from "@/types";
import type { CareerJobRow } from "./careers-utils";

export type CompanyInfo = {
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
};

function publicApi(path: string) {
  const base = (
    process.env.OPENATS_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ""
  ).replace(/\/$/, "");
  if (!base) throw new Error("API base URL is not configured");
  return fetch(`${base}/public${path}`, { cache: "no-store" });
}

/** Throws when the API fails: "no open roles" would be a false answer */
export async function getPublishedJobs(): Promise<CareerJobRow[]> {
  const res = await publicApi("/jobs");
  if (!res.ok) throw new Error(`Careers jobs failed: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: unknown };
  return Array.isArray(body.data) ? (body.data as CareerJobRow[]) : [];
}

/** Null when the company can't be read: the pages work without its name */
export const getCompanyInfo = cache(async (): Promise<CompanyInfo | null> => {
  try {
    const res = await publicApi("/company");
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: CompanyInfo | null };
    return body.data ?? null;
  } catch {
    return null;
  }
});

/** Null when the job is not open, which the API does not tell apart from one that never was. Throws when the API fails */
export const getPublicJob = cache(async (id: number): Promise<JobDetail | null> => {
  if (!Number.isInteger(id) || id <= 0) return null;

  const res = await publicApi(`/jobs/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Careers job ${id} failed: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: JobDetail };
  return body.data ?? null;
});

export async function getPublicQuestions(id: number): Promise<CustomQuestion[]> {
  try {
    const res = await publicApi(`/jobs/${id}/questions`);
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: CustomQuestion[] };
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}
