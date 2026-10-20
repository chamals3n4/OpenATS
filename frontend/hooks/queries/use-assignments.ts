import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/server-fetch";
import type { Assignment, AssignmentResource, CandidateAssignment, JobAssignment, SubmissionField } from "@/types";

export type AssignmentInput = {
  title: string;
  description: string;
  resources: AssignmentResource[];
  submissionFields: SubmissionField[];
  dueDays: number;
};

export function useAssignments() {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: () => serverFetch<{ data: Assignment[] }>("/assignments"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAssignment(id: number) {
  return useQuery({
    queryKey: ["assignments", id],
    queryFn: () => serverFetch<{ data: Assignment }>(`/assignments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignmentInput) =>
      serverFetch<{ data: Assignment }>("/assignments", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useUpdateAssignment(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignmentInput) =>
      serverFetch<{ data: Assignment }>(`/assignments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serverFetch(`/assignments/${id}`, { method: "DELETE" }),
    // Deleting an assignment also deletes the job stages it was attached to and everything
    // candidates handed in for it, so those cached copies are stale too.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["assignments"] }),
        queryClient.invalidateQueries({
          predicate: ({ queryKey }) => queryKey[0] === "jobs" && queryKey[2] === "assignments",
        }),
        queryClient.invalidateQueries({ queryKey: ["candidate-assignments"] }),
      ]),
  });
}

export type SendAssignmentResult = {
  sent: number;
  alreadyHad: number;
  failed: { candidateId: number; error: string }[];
};

/** Sends to one or many candidates; one that fails does not stop the rest. */
export function useSendAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { candidateIds: number[]; assignmentId: number; dueDays?: number }) =>
      serverFetch<{ data: SendAssignmentResult }>("/assignments/send", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidate-assignments"] }),
  });
}

export function useJobAssignments(jobId: number) {
  return useQuery({
    queryKey: ["jobs", jobId, "assignments"],
    queryFn: () => serverFetch<{ data: JobAssignment[] }>(`/assignments/job/${jobId}`),
    enabled: !!jobId,
  });
}

export function useAttachAssignment(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { assignmentId: number; triggerStageId: number }) =>
      serverFetch<{ data: JobAssignment }>(`/assignments/job/${jobId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "assignments"] }),
  });
}

export function useDetachAssignment(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      serverFetch(`/assignments/job/${jobId}/${attachmentId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "assignments"] }),
  });
}

export function useCandidateAssignments(candidateId: number) {
  return useQuery({
    queryKey: ["candidate-assignments", candidateId],
    queryFn: () =>
      serverFetch<{ data: CandidateAssignment[] }>(`/assignments/candidate/${candidateId}`),
    enabled: !!candidateId,
    staleTime: 1000 * 60,
  });
}
