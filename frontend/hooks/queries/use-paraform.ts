import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";

export type ParaformOverview = {
  connected: boolean;
  accountEmail: string | null;
  needsReconnect: boolean;
  roleLinks: Array<{
    id: number;
    paraformRoleId: string;
    paraformRoleTitle: string;
    jobId: number;
    jobTitle: string;
    candidatesImported: number;
  }>;
};

export type ParaformRole = { id: string; title: string };

export type ParaformSyncRun = {
  id: number;
  trigger: "scheduled" | "manual";
  status: "running" | "succeeded" | "failed";
  candidatesImported: number;
  problems: string[];
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

const KEY = ["paraform"] as const;

export function useParaformOverview() {
  return useQuery({
    queryKey: [...KEY, "overview"],
    queryFn: () =>
      clientFetch<{ data: ParaformOverview }>("/integrations/paraform"),
    staleTime: 1000 * 30,
  });
}

/** Asks Paraform whether this account may use the hiring-manager tools. */
export function useParaformAccess(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "access"],
    queryFn: () =>
      clientFetch<{ data: { access: "ok" | "no_access" } }>(
        "/integrations/paraform/access",
      ),
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useParaformRoles(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "roles"],
    queryFn: () =>
      clientFetch<{ data: ParaformRole[] }>("/integrations/paraform/roles"),
    enabled,
    staleTime: 1000 * 60,
    retry: false,
  });
}

export function useParaformRuns(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, "runs"],
    queryFn: () =>
      clientFetch<{ data: ParaformSyncRun[] }>("/integrations/paraform/runs"),
    enabled,
    // Keep the log moving while a run is going, so "Sync now" shows its result without a reload.
    refetchInterval: (query) =>
      query.state.data?.data.some((run) => run.status === "running")
        ? 3000
        : 60_000,
  });
}

function useParaformMutation<TVars = void>(
  fn: (vars: TVars) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useParaformConnectUrl() {
  return useMutation({
    mutationFn: () =>
      clientFetch<{ data: { url: string } }>(
        "/integrations/paraform/connect-url",
      ),
  });
}

export function useDisconnectParaform() {
  return useParaformMutation(() =>
    clientFetch("/integrations/paraform", { method: "DELETE" }),
  );
}

export function useLinkParaformRole() {
  return useParaformMutation(
    (input: {
      paraformRoleId: string;
      paraformRoleTitle: string;
      jobId: number;
    }) =>
      clientFetch("/integrations/paraform/role-links", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  );
}

export function useUnlinkParaformRole() {
  return useParaformMutation((id: number) =>
    clientFetch(`/integrations/paraform/role-links/${id}`, {
      method: "DELETE",
    }),
  );
}

export function useParaformSyncNow() {
  return useParaformMutation(() =>
    clientFetch("/integrations/paraform/sync", { method: "POST" }),
  );
}
