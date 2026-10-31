import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";
import { getPublishedJobs } from "./_lib/careers-api";

// Read on each request: jobs open and close, and the build has no API to ask
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const jobs = await getPublishedJobs();

  return [
    { url: `${base}/careers` },
    ...jobs.map((job) => ({ url: `${base}/careers/${job.id}`, lastModified: job.createdAt })),
  ];
}
