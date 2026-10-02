import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { CandidateEmail } from "@/types";

export function useCandidateEmails(candidateId: number) {
  return useQuery({
    queryKey: ["candidate-emails", candidateId],
    queryFn: () =>
      serverFetch<{ data: CandidateEmail[] }>(`/candidates/${candidateId}/emails`),
    enabled: !!candidateId,
    staleTime: 30_000,
  });
}

export function useSendCandidateEmail(candidateId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { subject: string; body: string; replyTo?: string }) =>
      serverFetch<{ data: CandidateEmail }>(`/candidates/${candidateId}/emails`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-emails", candidateId] });
    },
  });
}
