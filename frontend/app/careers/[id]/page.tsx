import { JobApplicationForm } from "./job-application-form";
import type { JobDetail, CustomQuestion } from "@/types";

const API_BASE = (
  process.env.OPENATS_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
).replace(/\/$/, "");

async function getJob(id: number): Promise<JobDetail | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/public/jobs/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: JobDetail };
    return body.data ?? null;
  } catch {
    return null;
  }
}

async function getQuestions(id: number): Promise<CustomQuestion[]> {
  if (!API_BASE) return [];
  try {
    const res = await fetch(`${API_BASE}/public/jobs/${id}/questions`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: CustomQuestion[] };
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export default async function JobApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);

  const [job, questions] = await Promise.all([
    getJob(jobId),
    getQuestions(jobId),
  ]);

  if (!job) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-6">
        <p className="text-red-500 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          Job not found.
        </p>
      </div>
    );
  }

  return <JobApplicationForm job={job} questions={questions} />;
}
