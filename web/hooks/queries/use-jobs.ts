import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { Job, JobDetail, CustomQuestion, User } from "@/types";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => serverFetch<{ data: Job[] }>("/jobs"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useJob(id: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => serverFetch<{ data: JobDetail }>(`/jobs/${id}`),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
    initialData: () => {
      const list = queryClient.getQueryData<{ data: Job[] }>(["jobs"]);
      const match = list?.data?.find((j) => j.id === id);
      if (!match) return undefined;
      return {
        data: { ...match, pipelineStages: [], hiringTeam: [] } as JobDetail,
      };
    },
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(["jobs"])?.dataUpdatedAt,
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
