import {
  useQuery,
  useQueries,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { Assessment, AssessmentQuestion } from "@/types";

export function useAssessments() {
  return useQuery({
    queryKey: ["assessments"],
    queryFn: () => serverFetch<{ data: Assessment[] }>("/assessments"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAssessment(id: number) {
  return useQuery({
    queryKey: ["assessments", id],
    queryFn: () =>
      serverFetch<{
        data: Assessment & {
          questions: (AssessmentQuestion & {
            options: {
              id: number;
              label: string;
              isCorrect: boolean;
              position: number;
            }[];
          })[];
        };
      }>(`/assessments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string | null;
      timeLimit: number;
      createdBy?: number;
      questions?: any[];
    }) =>
      serverFetch<{ data: Assessment }>("/assessments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUpdateAssessment(assessmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Assessment>) =>
      serverFetch<{ data: Assessment }>(`/assessments/${assessmentId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({
        queryKey: ["assessments", assessmentId],
      });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: number) =>
      serverFetch<{ data: Assessment }>(`/assessments/${assessmentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useCreateAssessmentQuestion(assessmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string | null;
      questionType: "short_answer" | "multiple_choice";
      points?: number;
      position: number;
      options?: { label: string; isCorrect?: boolean; position: number }[];
    }) =>
      serverFetch<{ data: AssessmentQuestion }>(
        `/assessments/${assessmentId}/questions`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["assessments", assessmentId],
      });
    },
  });
}

export function useUpdateAssessmentQuestion(assessmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      data,
    }: {
      questionId: number;
      data: {
        title?: string;
        description?: string | null;
        questionType?: "short_answer" | "multiple_choice";
        points?: number;
        position?: number;
        options?: { label: string; isCorrect?: boolean; position: number }[];
      };
    }) =>
      serverFetch<{ data: AssessmentQuestion }>(
        `/assessments/${assessmentId}/questions/${questionId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["assessments", assessmentId],
      });
    },
  });
}

export function useDeleteAssessmentQuestion(assessmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) =>
      serverFetch<{ data: AssessmentQuestion }>(
        `/assessments/${assessmentId}/questions/${questionId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["assessments", assessmentId],
      });
    },
  });
}

export function useJobAssessments(jobId: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "assessments"],
    queryFn: () =>
      serverFetch<{
        data: {
          id: number;
          assessmentId: number;
          triggerStageId: number;
          createdAt: string;
        }[];
      }>(`/jobs/${jobId}/assessments`),
    enabled: !!jobId,
  });
}

export function useAttachAssessment(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { assessmentId: number; triggerStageId: number }) =>
      serverFetch<{ data: any }>(`/jobs/${jobId}/assessments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["jobs", jobId, "assessments"],
      });
    },
  });
}

export function useDetachAssessment(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      serverFetch<{ data: any }>(`/jobs/${jobId}/assessments/${attachmentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["jobs", jobId, "assessments"],
      });
    },
  });
}

export function useCandidateAssessments(candidateId: number) {
  return useQuery({
    queryKey: ["candidate-assessments", candidateId],
    queryFn: () =>
      serverFetch<{
        data: {
          id: number;
          assessmentId: number;
          assessmentTitle: string;
          token: string;
          status: string;
          scorePercentage: number | null;
          passed: boolean | null;
          startedAt: string | null;
          completedAt: string | null;
          expiresAt: string;
        }[];
      }>(`/assessment-execution/candidate/${candidateId}`),
    enabled: !!candidateId,
    refetchInterval: candidateId ? 3000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useInviteToAssessment() {
  return useMutation({
    mutationFn: ({
      candidateId,
      assessmentId,
      expiryDays = 7,
    }: {
      candidateId: number;
      assessmentId: number;
      expiryDays?: number;
    }) =>
      serverFetch<{
        data: { token: string };
        didSendInvite?: boolean;
      }>(`/assessment-execution/invite`, {
        method: "POST",
        body: JSON.stringify({ candidateId, assessmentId, expiryDays }),
      }),
  });
}

export function useAttemptResults(attemptId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["attempt-results", attemptId],
    queryFn: () =>
      serverFetch<{
        data: {
          attempt: {
            id: number;
            candidateId: number;
            assessmentId: number;
            status: string;
            startedAt: string | null;
            completedAt: string | null;
            scoreRaw: number | null;
            scoreTotal: number | null;
            scorePercentage: number | null;
            passed: boolean | null;
            assessmentTitle: string;
            assessmentDescription: string | null;
            candidateName: string;
            candidateEmail: string;
          };
          questions: {
            id: number;
            title: string;
            description: string | null;
            questionType: "single_choice" | "multiple_choice" | "text";
            points: number;
            position: number;
            options: {
              id: number;
              label: string;
              isCorrect: boolean;
            }[];
            answer: {
              answerText: string | null;
              selectedOptionIds: number[];
              pointsEarned: number | null;
            } | null;
          }[];
        };
      }>(`/assessment-execution/attempts/${attemptId}/results`),
    enabled: (options?.enabled ?? true) && !!attemptId,
  });
}
