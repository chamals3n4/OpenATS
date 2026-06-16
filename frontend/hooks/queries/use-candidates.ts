import {
  useQuery,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type {
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
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : "";

  const path = jobId
    ? `/candidates/jobs/${jobId}${query}`
    : `/candidates${query}`;

  const hasFilters = !!(filters?.stageId || filters?.search);
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
    mutationFn: ({ id, newStageId }: { id: number; newStageId: number }) =>
      serverFetch<{
        data: Candidate;
        stageAutomation: StageAutomationFlags;
      }>(`/candidates/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ newStageId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.id] });
    },
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
