import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
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
      clientFetch<{ data: InterviewListItem[] }>(
        `/interviews${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 1000 * 60 * 5,
  });
}

/** When one interviewer is already busy: start and end of each upcoming interview. */
export type AllocatedSlot = {
  start: string;
  end: string;
};

/** The chosen interviewer's upcoming interviews, used to mark times that would clash */
export function useAllocatedSlots(interviewerId: number | null) {
  return useQuery({
    queryKey: ["interviews", "allocated-slots", interviewerId],
    queryFn: () =>
      clientFetch<{ data: AllocatedSlot[] }>(`/interviews/allocated-slots?interviewerId=${interviewerId}`),
    enabled: !!interviewerId,
    staleTime: 1000 * 30,
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      clientFetch(`/interviews/${id}`, { method: "DELETE" }),
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
      status?: "pending_schedule" | "scheduled" | "completed" | "cancelled" | "expired";
      eventName?: string;
      eventType?: "virtual" | "onsite";
      meetingUrl?: string | null;
      location?: string | null;
      bodyText?: string | null;
    }) =>
      clientFetch(`/interviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
