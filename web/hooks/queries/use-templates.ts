import {
  useQuery,
  useQueries,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type { Template } from "@/types";
import { serverFetch } from "@/lib/auth-action";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => serverFetch<{ data: Template[] }>("/templates"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTemplate(id: number) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => serverFetch<{ data: Template }>(`/templates/${id}`),
    enabled: !!id,
    staleTime: 1000 * 6 * 5,
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
