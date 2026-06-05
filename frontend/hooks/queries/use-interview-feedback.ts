import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";

export function useInterviewFeedback(interviewId: number) {
  return useQuery({
    queryKey: ["interview-feedback", interviewId],
    queryFn: () =>
      serverFetch<{ data: Array<{
        id: number;
        interviewId: number;
        content: string;
        rating: number | null;
        createdAt: string;
        updatedAt: string;
        authorName: string;
      }> }>(`/interviews/${interviewId}/feedback`),
    staleTime: 30_000,
    enabled: !!interviewId,
  });
}

export function useAddInterviewFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      content,
      rating,
    }: {
      interviewId: number;
      content: string;
      rating?: number | null;
    }) =>
      serverFetch(`/interviews/${interviewId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ content, rating }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interview-feedback", variables.interviewId],
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteInterviewFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      feedbackId,
    }: {
      interviewId: number;
      feedbackId: number;
    }) =>
      serverFetch(`/interviews/${interviewId}/feedback/${feedbackId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["interview-feedback", variables.interviewId],
      });
    },
  });
}
