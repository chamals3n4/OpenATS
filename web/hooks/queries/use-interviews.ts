import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { InterviewListItem } from "@/types";

export function useInterviews(filters?: Record<string, string | number>) {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
  }
  const qs = params.toString();
  return useQuery({
    queryKey: ["interviews", filters],
    queryFn: () =>
      serverFetch<{ data: InterviewListItem[] }>(
        `/interviews${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      scheduledAt?: string | null;
      durationMinutes?: number | null;
      notes?: string | null;
      outcome?: "pending" | "pass" | "fail";
      status?: "pending_schedule" | "scheduled" | "completed" | "cancelled";
      eventName?: string;
      eventType?: "virtual" | "onsite";
      meetingUrl?: string | null;
      bodyText?: string | null;
    }) =>
      serverFetch(`/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
