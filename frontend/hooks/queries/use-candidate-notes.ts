import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";

export interface CandidateNote {
  id: number;
  candidateId: number;
  authorId: number | null;
  authorName: string | null;
  stageName: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}
export function useCandidateNotes(candidateId: number) {
  return useQuery({ queryKey: ["candidates", candidateId, "notes"], queryFn: () => clientFetch<{ data: CandidateNote[] }>(`/candidates/${candidateId}/notes`) });
}
export function useSaveCandidateNote(candidateId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: string }) => clientFetch<{ data: { id: number } }>(`/candidates/${candidateId}/notes${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["candidates", candidateId, "notes"] }),
  });
}
export function useDeleteCandidateNote(candidateId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => clientFetch(`/candidates/${candidateId}/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["candidates", candidateId, "notes"] }),
  });
}
