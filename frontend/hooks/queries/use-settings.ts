import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
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
      // Show what the server saved straight away, then confirm it with a refetch.
      queryClient.setQueryData(["settings", "allowed-origins"], res);
      queryClient.invalidateQueries({
        queryKey: ["settings", "allowed-origins"],
      });
    },
  });
}

/** Whether AI CV analysis is on. Readable by everyone, since it decides what the candidate page shows. */
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
      // Candidates carry their analysis only while it is on, so what is cached is now out of date.
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
