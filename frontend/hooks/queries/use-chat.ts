import { useQuery } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { ChatMessage } from "@/types";

export function useChatHistory(jobId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["chat", "job", jobId],
    queryFn: () => serverFetch<{ data: ChatMessage[] }>(`/chat/job/${jobId}`),
    enabled: enabled && !!jobId,
    // Loaded again each time the discussion opens. While it is closed nothing keeps this copy up
    // to date, and the app-wide five minutes would show messages from before the last visit.
    staleTime: 0,
  });
}

export function useCandidateChatHistory(candidateId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["chat", "candidate", candidateId],
    queryFn: () =>
      serverFetch<{ data: ChatMessage[] }>(`/chat/candidate/${candidateId}`),
    enabled: enabled && !!candidateId,
  });
}
