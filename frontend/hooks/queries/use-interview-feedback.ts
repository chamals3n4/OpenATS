import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";

export type Recommendation = "strong_no" | "no" | "yes" | "strong_yes";

export type InterviewScorecard = {
  id: number;
  interviewId: number;
  authorId: number;
  content: string;
  rating: number | null;
  recommendation: Recommendation | null;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  ratings: { criterionId: number; name: string; rating: number }[];
};

/** `hiddenCount` is how many scorecards an interviewer cannot see until they submit their own. */
export type ScorecardMeta = { hasSubmitted: boolean; hiddenCount: number };

export function useInterviewFeedback(interviewId: number) {
  return useQuery({
    queryKey: ["interview-feedback", interviewId],
    queryFn: () =>
      serverFetch<{ data: InterviewScorecard[]; meta?: ScorecardMeta }>(
        `/interviews/${interviewId}/feedback`,
      ),
    staleTime: 30_000,
    enabled: !!interviewId,
  });
}

export function useAddInterviewFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      interviewId,
      ...body
    }: {
      interviewId: number;
      content: string;
      rating?: number | null;
      recommendation?: Recommendation | null;
      ratings?: { criterionId: number; rating: number }[];
    }) =>
      serverFetch(`/interviews/${interviewId}/feedback`, {
        method: "POST",
        body: JSON.stringify(body),
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
