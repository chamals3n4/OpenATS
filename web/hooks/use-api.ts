"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type {
  Job,
  JobDetail,
  PipelineStage,
  CurrentUser,
  ChatMessage,
  CustomQuestion,
  Company,
  Department,
  Assessment,
  AssessmentQuestion,
  Candidate,
  CandidateDetail,
  StageAutomationFlags,
  User,
  Template,
  Offer,
  AnalyticsReport,
  AnalyticsExportPayload,
  ActiveLog,
  ActiveLogFilters,
  ActiveLogExportPayload,
} from "@/types";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => serverFetch<{ data: Job[] }>("/jobs"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => serverFetch<{ data: JobDetail }>(`/jobs/${id}`),
    enabled: !!id,
  });
}

export function usePipeline(jobId: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "pipeline"],
    queryFn: () =>
      serverFetch<{ data: PipelineStage[] }>(`/jobs/${jobId}/pipeline`),
    enabled: !!jobId,
  });
}

export function useCreateStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      position: number;
      stageType?: string;
    }) =>
      serverFetch<{ data: PipelineStage }>(`/jobs/${jobId}/pipeline`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useUpdateStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stageId,
      data,
    }: {
      stageId: number;
      data: {
        name?: string;
        stageType?: string;
        position?: number;
        offerTemplateId?: number | null;
        offerMode?: string | null;
        offerExpiryDays?: number | null;
        rejectionTemplateId?: number | null;
      };
    }) =>
      serverFetch<{ data: PipelineStage }>(
        `/jobs/${jobId}/pipeline/${stageId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useDeleteStage(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: number) =>
      serverFetch<{ data: PipelineStage }>(
        `/jobs/${jobId}/pipeline/${stageId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useReorderStages(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stages: Array<{ id: number; position: number }>) =>
      serverFetch<{ data: PipelineStage[] }>(
        `/jobs/${jobId}/pipeline/reorder`,
        {
          method: "POST",
          body: JSON.stringify({ stages }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "pipeline"] });
    },
  });
}

export function useCustomQuestions(jobId: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "questions"],
    queryFn: () =>
      serverFetch<{ data: CustomQuestion[] }>(`/jobs/${jobId}/questions`),
    enabled: !!jobId,
  });
}

export function useCreateQuestion(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      questionType: "short_answer" | "long_answer" | "checkbox" | "radio";
      isRequired: boolean;
      position: number;
      options?: { label: string; isCorrect: boolean; position: number }[];
    }) =>
      serverFetch<{ data: CustomQuestion }>(`/jobs/${jobId}/questions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "questions"] });
    },
  });
}

export function useUpdateQuestion(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      data,
    }: {
      questionId: number;
      data: {
        title?: string;
        questionType?: "short_answer" | "long_answer" | "checkbox" | "radio";
        isRequired?: boolean;
        position?: number;
      };
    }) =>
      serverFetch<{ data: CustomQuestion }>(
        `/jobs/${jobId}/questions/${questionId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "questions"] });
    },
  });
}

export function useDeleteQuestion(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) =>
      serverFetch<{ data: CustomQuestion }>(
        `/jobs/${jobId}/questions/${questionId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "questions"] });
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => serverFetch<{ data: CurrentUser }>("/users/me"),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => serverFetch<{ data: User[] }>("/users"),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => serverFetch<{ data: User }>(`/users/${id}`),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
      serverFetch<{ data: User }>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
}

export function useHiringTeam(jobId: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "team"],
    queryFn: () => serverFetch<{ data: User[] }>(`/jobs/${jobId}/team`),
    enabled: !!jobId,
  });
}

export function useAddHiringTeamMember(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: number; role?: string }) =>
      serverFetch<{ data: any }>(`/jobs/${jobId}/team`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "team"] });
    },
  });
}

export function useRemoveHiringTeamMember(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      serverFetch<{ data: any }>(`/jobs/${jobId}/team/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "team"] });
    },
  });
}

export function useChatHistory(jobId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["chat", "job", jobId],
    queryFn: () => serverFetch<{ data: ChatMessage[] }>(`/chat/job/${jobId}`),
    enabled: enabled && !!jobId,
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

export function useCompany() {
  return useQuery({
    queryKey: ["company"],
    queryFn: () => serverFetch<{ data: Company | null }>("/company"),
  });
}

export function useUpsertCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) =>
      serverFetch<{ data: Company }>("/company", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => serverFetch<{ data: Department[] }>("/company/departments"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      serverFetch<{ data: Department }>("/company/departments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      serverFetch<{ data: Department }>(`/company/departments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch<{ data: Department }>(`/company/departments/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      departmentId: number;
      employmentType: string;
      location?: string;
      description?: string;
      skills?: string[];
      salaryType?: "fixed" | "range" | null;
      currency?: string | null;
      payFrequency?: string | null;
      salaryFixed?: number | null;
      salaryMin?: number | null;
      salaryMax?: number | null;
      status?: Job["status"];
    }) =>
      serverFetch<{ data: Job }>("/jobs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateJob(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title?: string;
      departmentId?: number;
      employmentType?: Job["employmentType"];
      location?: string | null;
      description?: string | null;
      skills?: string[];
      salaryType?: "fixed" | "range" | null;
      currency?: string | null;
      payFrequency?: string | null;
      salaryFixed?: number | null;
      salaryMin?: number | null;
      salaryMax?: number | null;
      status?: Job["status"];
    }) =>
      serverFetch<{ data: Job }>(`/jobs/${jobId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) =>
      serverFetch<{ data: Job }>(`/jobs/${jobId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

// assessments

export function useAssessments() {
  return useQuery({
    queryKey: ["assessments"],
    queryFn: () => serverFetch<{ data: Assessment[] }>("/assessments"),
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
      passScore: number;
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

export function useOffers(jobId?: number) {
  return useQuery({
    queryKey: jobId ? ["offers", "job", jobId] : ["offers", "all"],
    queryFn: () =>
      serverFetch<{ data: any[] }>(jobId ? `/offers/job/${jobId}` : `/offers`),
    enabled: jobId === undefined || !!jobId,
  });
}

export function useOffer(id: number) {
  return useQuery({
    queryKey: ["offers", id],
    queryFn: () => serverFetch<{ data: Offer }>(`/offers/${id}`),
    enabled: !!id,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Offer>) =>
      serverFetch<{ data: Offer }>("/offers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      if (variables.jobId) {
        queryClient.invalidateQueries({
          queryKey: ["offers", "job", variables.jobId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      offerId,
      data,
    }: {
      offerId: number;
      data: Partial<Offer>;
    }) =>
      serverFetch<{ data: Offer }>(`/offers/${offerId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["offers", variables.offerId],
      });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch<{ data: any }>(`/offers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      serverFetch<{ data: any }>(`/offers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["offers", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useCandidates(
  jobId?: number,
  filters?: { stageId?: number; search?: string },
) {
  const params = new URLSearchParams();
  if (filters?.stageId) params.set("stageId", String(filters.stageId));
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString() ? `?${params.toString()}` : "";

  const path = jobId
    ? `/candidates/jobs/${jobId}${query}`
    : `/candidates${query}`;

  return useQuery({
    queryKey: ["candidates", jobId ?? "all", filters],
    queryFn: () => serverFetch<{ data: Candidate[] }>(path),
  });
}

export function useCandidate(id: number, options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && !!id;
  return useQuery({
    queryKey: ["candidates", id],
    queryFn: () => serverFetch<{ data: CandidateDetail }>(`/candidates/${id}`),
    enabled,
    refetchInterval: (query) =>
      enabled && query.state.data?.data?.cvAnalysis?.status === "pending"
        ? 2500
        : false,
  });
}

export function useMoveCandidateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newStageId }: { id: number; newStageId: number }) =>
      serverFetch<{
        data: Candidate;
        stageAutomation: StageAutomationFlags;
      }>(`/candidates/${id}/stage`, {
        method: "PUT",
        body: JSON.stringify({ newStageId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
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

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch<{ data: Candidate }>(`/candidates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useUpdateCandidateBasicDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: number;
      formData: FormData;
    }) => {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        body: formData,
      });

      const json = (await res.json().catch(() => null)) as
        | { data: Candidate }
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ??
            "Failed to update candidate",
        );
      }

      return json as { data: Candidate };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.id] });
    },
  });
}

// templates

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => serverFetch<{ data: Template[] }>("/templates"),
  });
}

export function useTemplate(id: number) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => serverFetch<{ data: Template }>(`/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Template>) =>
      serverFetch<{ data: Template }>("/templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Template> }) =>
      serverFetch<{ data: Template }>(`/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templates", variables.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      serverFetch<{ data: Template }>(`/templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: ({ id, context }: { id: number; context: any }) =>
      serverFetch<any>(`/templates/${id}/preview`, {
        method: "POST",
        body: JSON.stringify({ context }),
      }),
  });
}

export function useAnalyticsReport(
  period: "7d" | "30d" | "90d",
  departmentId?: number,
) {
  return useQuery({
    queryKey: ["reports", "analytics", period, departmentId ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (departmentId) params.set("departmentId", String(departmentId));
      return serverFetch<{ data: AnalyticsReport }>(
        `/reports/analytics?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useExportAnalyticsReport() {
  return useMutation({
    mutationFn: async ({
      period,
      departmentId,
      format,
    }: {
      period: "7d" | "30d" | "90d";
      departmentId?: number;
      format: "csv" | "json";
    }) => {
      const params = new URLSearchParams({ period, format });
      if (departmentId) params.set("departmentId", String(departmentId));

      return serverFetch<{ data: AnalyticsExportPayload }>(
        `/reports/analytics/export?${params.toString()}`,
      );
    },
  });
}

export function useActiveLogs(
  filters: ActiveLogFilters,
  options?: {
    enabled?: boolean;
    live?: boolean;
  },
) {
  return useQuery({
    queryKey: ["logs", "active", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search?.trim()) params.set("search", filters.search.trim());
      if (filters.level) params.set("level", filters.level);
      if (filters.service) params.set("service", filters.service);
      if (filters.statusGroup) params.set("statusGroup", filters.statusGroup);
      if (filters.windowSize) params.set("windowSize", filters.windowSize);
      if (filters.limit) params.set("limit", String(filters.limit));
      if (filters.offset) params.set("offset", String(filters.offset));

      const res = await fetch(`/api/logs?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | ActiveLog[]
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? "Failed to load logs",
        );
      }

      return (json ?? []) as ActiveLog[];
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.live ? 4500 : false,
    staleTime: 2000,
  });
}

export function useSettingsAllowedOrigins() {
  return useQuery({
    queryKey: ["settings", "allowed-origins"],
    queryFn: () =>
      serverFetch<{ data: { origins: string[] } }>("/settings/allowed-origins"),
    staleTime: 1000 * 30,
  });
}

export function useUpdateSettingsAllowedOrigins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (origins: string[]) =>
      serverFetch<{ data: { origins: string[] } }>("/settings/allowed-origins", {
        method: "PUT",
        body: JSON.stringify({ origins }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "allowed-origins"] });
    },
  });
}

export function useExportActiveLogs() {
  return useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: "csv" | "json";
      filters?: Omit<ActiveLogFilters, "limit" | "offset">;
    }) => {
      const params = new URLSearchParams({ format });

      if (filters?.search?.trim()) params.set("search", filters.search.trim());
      if (filters?.level) params.set("level", filters.level);
      if (filters?.service) params.set("service", filters.service);
      if (filters?.statusGroup) params.set("statusGroup", filters.statusGroup);
      if (filters?.windowSize) params.set("windowSize", filters.windowSize);

      const res = await fetch(`/api/logs/export?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | ActiveLogExportPayload
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? "Failed to export logs",
        );
      }

      return json as ActiveLogExportPayload;
    },
  });
}
