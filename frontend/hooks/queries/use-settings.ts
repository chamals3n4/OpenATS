import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/server-fetch";
import type { AiSettings } from "@/types";

export function useSettingsAllowedOrigins() {
  return useQuery({
    queryKey: ["settings", "allowed-origins"],
    queryFn: () =>
      serverFetch<{ data: { origins: string[] } }>("/settings/allowed-origins"),
    staleTime: 1000 * 30,
  });
}

export function useUpdateSettingsAllowedOrigins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (origins: string[]) =>
      serverFetch<{ data: { origins: string[] } }>(
        "/settings/allowed-origins",
        {
          method: "PUT",
          body: JSON.stringify({ origins }),
        },
      ),
    onSuccess: (res) => {
      // Show the saved value, then refetch
      queryClient.setQueryData(["settings", "allowed-origins"], res);
      queryClient.invalidateQueries({
        queryKey: ["settings", "allowed-origins"],
      });
    },
  });
}

export type WorkerStatus = "connected" | "missing" | "unknown";

/** Is the background worker running */
export function useWorkerStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["settings", "worker"],
    queryFn: () => serverFetch<{ data: { status: WorkerStatus } }>("/settings/worker"),
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  });
}

/** Is AI CV analysis on */
export function useAiSettings() {
  return useQuery({
    queryKey: ["settings", "ai"],
    queryFn: () => serverFetch<{ data: AiSettings }>("/settings/ai"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cvAnalysisEnabled: boolean) =>
      serverFetch<{ data: AiSettings }>("/settings/ai", {
        method: "PUT",
        body: JSON.stringify({ cvAnalysisEnabled }),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "ai"], res);
      // Refetch candidates after the setting changes
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
