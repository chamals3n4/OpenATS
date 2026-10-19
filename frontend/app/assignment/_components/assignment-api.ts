import type { AssignmentResource, AssignmentStatus, SubmissionField } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface PublicAssignment {
  title: string;
  description: string;
  resources: AssignmentResource[];
  status: AssignmentStatus;
  dueAt: string;
  submittedAt: string | null;
  submissionFields: SubmissionField[];
  submissionAnswers: Record<string, string>;
  firstName: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/public${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchAssignment = (token: string) =>
  apiFetch<{ data: PublicAssignment }>(`/assignment/${token}`);

export const submitAssignment = (token: string, answers: Record<string, string>) =>
  apiFetch<{ data: { submitted: boolean } }>(`/assignment/${token}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
