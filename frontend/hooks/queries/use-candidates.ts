import {
  useQuery,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type {
  BoardCandidate,
  Candidate,
  CandidateDetail,
  CandidateRejection,
  CandidateInterview,
  StageAutomationFlags,
} from "@/types";
import { serverFetch } from "@/lib/auth-action";

export type CandidatePagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type CandidateListResponse = {
  data: Candidate[];
  pagination?: CandidatePagination;
};

export type CandidateBulkDeleteFilters = {
  jobId?: number;
  stageId?: number;
  search?: string;
  status?: "active" | "rejected" | "offered" | "hired" | "withdrawn";
};

export function useCandidates(
  jobId?: number,
  filters?: {
    stageId?: number;
    search?: string;
    status?: "active" | "rejected" | "offered" | "hired" | "withdrawn";
    /** "score": highest total first, candidates with a knockout answer last. */
    sort?: "score";
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const params = new URLSearchParams();
  if (filters?.stageId) params.set("stageId", String(filters.stageId));
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.sort) params.set("sort", filters.sort);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : "";

  const path = jobId
    ? `/candidates/jobs/${jobId}${query}`
    : `/candidates${query}`;

  const hasFilters = !!(filters?.stageId || filters?.search || filters?.sort);
  const seedInitialData =
    jobId && !hasFilters
      ? () => {
          const allLists = queryClient.getQueriesData<CandidateListResponse>({
            queryKey: ["candidates", "all"],
          });
          for (const [, listData] of allLists) {
            if (!listData?.data?.length) continue;
            return {
              data: listData.data.filter((c) => c.jobId === jobId),
              pagination: undefined,
            };
          }
          return undefined;
        }
      : undefined;

  const seedUpdatedAt =
    jobId && !hasFilters
      ? () => {
          const allLists = queryClient.getQueriesData<CandidateListResponse>({
            queryKey: ["candidates", "all"],
          });
          for (const [key] of allLists) {
            const s = queryClient.getQueryState(key);
            if (s?.dataUpdatedAt) return s.dataUpdatedAt;
          }
          return undefined;
        }
      : undefined;

  return useQuery({
    queryKey: ["candidates", jobId ?? "all", filters],
    queryFn: () => serverFetch<CandidateListResponse>(path),
    enabled: options?.enabled !== false,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    initialData: seedInitialData,
    initialDataUpdatedAt: seedUpdatedAt,
  });
}

/** Key of the pipeline board's data. Kept apart from the `candidates` lists, whose rows carry more. */
export const boardKey = (jobId: number) => ["pipeline-board", jobId] as const;

/** Every candidate still in the process for one job, in the saved card order. */
export function useBoardCandidates(jobId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: boardKey(jobId),
    queryFn: () =>
      serverFetch<{ data: BoardCandidate[] }>(`/candidates/jobs/${jobId}/board`),
    enabled: options?.enabled !== false && !!jobId,
    staleTime: 15_000,
    refetchOnMount: "always",
  });
}

export function useCandidate(id: number, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && !!id;
  return useQuery({
    queryKey: ["candidates", id],
    queryFn: () => serverFetch<{ data: CandidateDetail }>(`/candidates/${id}`),
    enabled,

    placeholderData: () => {
      const allLists = queryClient.getQueriesData<CandidateListResponse>({
        queryKey: ["candidates"],
      });
      for (const [queryKey, listData] of allLists) {
        if ((queryKey as unknown[]).length < 3) continue;
        if (!Array.isArray(listData?.data)) continue;
        const match = listData.data.find((c) => c.id === id);
        if (match) {
          return {
            data: {
              ...match,
              cvAnalysis: null,
              answers: [],
              selections: [],
              history: [],
              activities: [],
              offer: null,
              rejections: [],
              interviews: [],
            } as CandidateDetail,
          };
        }
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useMoveCandidateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      newStageId,
      position,
    }: {
      id: number;
      newStageId: number;
      /** Where the card lands in the column, 0 being the top. Omitted means the end. */
      position?: number;
    }) =>
      serverFetch<{
        data: Candidate;
        stageAutomation: StageAutomationFlags;
      }>(`/candidates/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ newStageId, position }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.id] });
    },
  });
}

export type BulkMoveResult = {
  moved: { id: number; jobId: number }[];
  failed: { id: number; error: string }[];
  assessmentInvitesSent: number;
  assessmentInvitesSkipped: number;
};

/** Moves several candidates into one stage in a single request. */
export function useBulkMoveCandidates() {
  return useMutation({
    mutationFn: ({ candidateIds, newStageId }: { candidateIds: number[]; newStageId: number }) =>
      serverFetch<{ data: BulkMoveResult }>("/candidates/bulk/stage", {
        method: "PUT",
        body: JSON.stringify({ candidateIds, newStageId }),
      }),
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch<{ data: Candidate }>(`/candidates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useBulkDeleteCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filters: CandidateBulkDeleteFilters) =>
      serverFetch<{ data: { count: number; ids: number[] } }>(
        "/candidates/bulk",
        {
          method: "DELETE",
          body: JSON.stringify(filters),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
  });
}

export function useUpdateCandidateBasicDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: number;
      formData: FormData;
    }) => {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        body: formData,
      });

      const json = (await res.json().catch(() => null)) as
        | { data: Candidate }
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ??
            "Failed to update candidate",
        );
      }

      return json as { data: Candidate };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.id] });
    },
  });
}

export function useRejectCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        templateId?: number | null;
        reason?: string;
        internalNote?: string;
        emailStatus: "not_sent" | "sent";
      };
    }) =>
      serverFetch<{ data: CandidateRejection }>(`/candidates/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

/** Rejects several candidates with one reason and no email, e.g. the ones flagged by a knockout answer. */
export function useBulkRejectCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { candidateIds: number[]; reason: string }) =>
      serverFetch<{ data: { rejected: number[]; failed: { id: number; error: string }[] } }>(
        "/candidates/bulk/reject",
        { method: "POST", body: JSON.stringify(data) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });
}

/** Sets the signed-in user's 1-5 star rating of a candidate; null clears it. */
export function useRateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number | null }) =>
      serverFetch(`/candidates/${id}/rating`, {
        method: "PUT",
        body: JSON.stringify({ rating }),
      }),
    // Returned, so the mutation settles only once the fresh scores have loaded.
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidates", variables.id], exact: true }),
        queryClient.invalidateQueries({ queryKey: ["candidates"] }),
      ]),
  });
}

export function useUnrejectCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch<{
        data: { candidate: Candidate; restoredStageId: number | null };
      }>(`/candidates/${id}/unreject`, { method: "POST" }),
    onSuccess: (_, candidateId) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidateId,
      data,
    }: {
      candidateId: number;
      data: {
        stageId: number;
        scheduledAt?: string;
        durationMinutes?: number;
        notes?: string;
      };
    }) =>
      serverFetch<{ data: CandidateInterview }>(
        `/candidates/${candidateId}/interviews`,
        { method: "POST", body: JSON.stringify(data) },
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["candidates", variables.candidateId],
      });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      candidateId,
      data,
    }: {
      interviewId: number;
      candidateId: number;
      data: {
        notes?: string;
        outcome?: "pending" | "pass" | "fail";
        scheduledAt?: string;
        durationMinutes?: number;
      };
    }) =>
      serverFetch<{ data: CandidateInterview }>(`/interviews/${interviewId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["candidates", variables.candidateId],
      });
    },
  });
}
