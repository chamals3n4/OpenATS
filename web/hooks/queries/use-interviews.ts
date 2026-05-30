import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";

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
  return useQuery({
    queryKey: ["interviews", filters],
    queryFn: () =>
      serverFetch<{ data: unknown[] }>(`/interviews${qs ? `?${qs}` : ""}`),
    staleTime: 60_000,
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch(`/interviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
