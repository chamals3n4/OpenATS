import { useQuery, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { CandidateInterview } from "@/types";

/** Fetch all interviews with optional filters */
export function useInterviews(filters?: {
  jobId?: number;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.jobId) params.set("jobId", String(filters.jobId));
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  const qs = params.toString();
  const path = `/interviews${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["interviews", filters],
    queryFn: () =>
      serverFetch<{
        data: Array<{
          id: number;
          candidateId: number;
          scheduledAt: string | null;
          outcome: "pending" | "pass" | "fail";
          candidateName: string;
          jobTitle: string | null;
          stageName: string | null;
        }>;
      }>(path),
    staleTime: 1000 * 60 * 1,
  });
}
