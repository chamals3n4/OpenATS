import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { PipelineStage } from "@/types";

export function usePipeline(jobId: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "pipeline"],
    queryFn: () =>
      serverFetch<{ data: PipelineStage[] }>(`/jobs/${jobId}/pipeline`),

    enabled: !!jobId,
  });
}

export function useCreateStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      position: number;
      stageType?: string;
    }) =>
      serverFetch<{ data: PipelineStage }>(`/jobs/${jobId}/pipeline`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useUpdateStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stageId,
      data,
    }: {
      stageId: number;
      data: {
        name?: string;
        stageType?: string;
        position?: number;
      };
    }) =>
      serverFetch<{ data: PipelineStage }>(
        `/jobs/${jobId}/pipeline/${stageId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useDeleteStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: number) =>
      serverFetch<{ data: PipelineStage }>(
        `/jobs/${jobId}/pipeline/${stageId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useReorderStages(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stages: Array<{ id: number; position: number }>) =>
      serverFetch<{ data: PipelineStage[] }>(
        `/jobs/${jobId}/pipeline/reorder`,
        {
          method: "POST",
          body: JSON.stringify({ stages }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}
