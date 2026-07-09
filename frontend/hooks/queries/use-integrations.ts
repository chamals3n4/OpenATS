import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";

export type IntegrationStatus = {
  provider: "google_meet";
  connected: boolean;
  accountEmail: string | null;
};

export function useIntegrationStatus(initialData?: IntegrationStatus[]) {
  return useQuery({
    queryKey: ["integrations", "status"],
    queryFn: () => serverFetch<{ data: IntegrationStatus[] }>("/integrations/status"),
    staleTime: 1000 * 60,
    initialData: initialData ? { data: initialData } : undefined,
  });
}

export function useUserIntegrationStatus(userId: number | null) {
  return useQuery({
    queryKey: ["integrations", "status", userId],
    queryFn: () => serverFetch<{ data: IntegrationStatus[] }>(`/integrations/status/${userId}`),
    enabled: userId != null,
    staleTime: 1000 * 30,
  });
}

export function useGoogleAuthorizeUrl() {
  return useMutation({
    mutationFn: () =>
      serverFetch<{ data: { url: string } }>("/integrations/google/authorize-url"),
  });
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      serverFetch<{ data: { disconnected: boolean } }>("/integrations/google", {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "status"] });
    },
  });
}
