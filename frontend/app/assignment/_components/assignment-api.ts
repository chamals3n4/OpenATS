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

/** Keeps the HTTP status, so the page can tell a wrong link (404) from a failure worth retrying. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/public${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    // No answer at all: offline, or the server is not reachable.
    throw new ApiError("Could not reach the server", null);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError((err as { error?: string }).error ?? `HTTP ${res.status}`, res.status);
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
