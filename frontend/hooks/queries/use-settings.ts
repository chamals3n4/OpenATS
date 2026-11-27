import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import type { AiSettings } from "@/types";

export function useSettingsAllowedOrigins() {
  return useQuery({
    queryKey: ["settings", "allowed-origins"],
    queryFn: () =>
      clientFetch<{ data: { origins: string[] } }>("/settings/allowed-origins"),
    staleTime: 1000 * 30,
  });
}

export function useUpdateSettingsAllowedOrigins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (origins: string[]) =>
      clientFetch<{ data: { origins: string[] } }>(
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
    queryFn: () => clientFetch<{ data: { status: WorkerStatus } }>("/settings/worker"),
    staleTime: 1000 * 30,
    enabled: options?.enabled ?? true,
  });
}

/** Is AI CV analysis on */
export function useAiSettings() {
  return useQuery({
    queryKey: ["settings", "ai"],
    queryFn: () => clientFetch<{ data: AiSettings }>("/settings/ai"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cvAnalysisEnabled: boolean) =>
      clientFetch<{ data: AiSettings }>("/settings/ai", {
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

export function useUpdateAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: { provider: AiSettings["provider"]; apiKey?: string }) =>
      clientFetch<{ data: AiSettings }>("/settings/ai", { method: "PUT", body: JSON.stringify(settings) }),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "ai"], res);
      queryClient.invalidateQueries({ queryKey: ["settings", "ai", "models"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientFetch<{ data: AiSettings }>("/settings/ai", { method: "DELETE" }),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "ai"], res);
      queryClient.invalidateQueries({ queryKey: ["settings", "ai", "models"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useTestAiProvider() {
  return useMutation({
    mutationFn: () => clientFetch<{ data: { connected: boolean } }>("/settings/ai/test", { method: "POST" }),
  });
}

export type AiModel = { id: string; name: string; lifecycle: "active" | "deprecated" | "unknown" };
export function useAiModels(enabled: boolean, provider?: string) {
  return useQuery({ queryKey: ["settings", "ai", "models", provider], queryFn: () => clientFetch<{ data: AiModel[] }>("/settings/ai/models"), enabled, staleTime: 60_000, retry: false });
}
export function useUpdateAiModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (model: string) => clientFetch<{ data: AiSettings }>("/settings/ai/model", { method: "PUT", body: JSON.stringify({ model }) }),
    onSuccess: (res) => queryClient.setQueryData(["settings", "ai"], res),
  });
}
