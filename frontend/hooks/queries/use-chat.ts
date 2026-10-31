import { useQuery } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import type { ChatMessage } from "@/types";

export function useChatHistory(jobId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["chat", "job", jobId],
    queryFn: () => clientFetch<{ data: ChatMessage[] }>(`/chat/job/${jobId}`),
    enabled: enabled && !!jobId,
    // Always refetch when the panel opens
    staleTime: 0,
  });
}

export function useCandidateChatHistory(candidateId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["chat", "candidate", candidateId],
    queryFn: () =>
      clientFetch<{ data: ChatMessage[] }>(`/chat/candidate/${candidateId}`),
    enabled: enabled && !!candidateId,
  });
}
