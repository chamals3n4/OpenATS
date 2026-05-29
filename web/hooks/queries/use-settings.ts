import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";

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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "allowed-origins"],
      });
    },
  });
}
