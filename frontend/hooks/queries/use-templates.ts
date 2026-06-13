import {
  useQuery,
  useQueries,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type { Template } from "@/types";
import { serverFetch } from "@/lib/auth-action";
import type { PaginationInfo } from "@/components/table/table-footer";

export type TemplateListParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
};

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => serverFetch<{ data: Template[] }>("/templates"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTemplatesList(params: TemplateListParams = {}) {
  return useQuery({
    queryKey: ["templates", "list", params],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 15) });
      if (params.search) qs.set("search", params.search);
      if (params.type) qs.set("type", params.type);
      return serverFetch<{ data: Template[]; pagination: PaginationInfo }>(`/templates?${qs}`);
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

export function useBulkDeleteTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      serverFetch<{ count: number }>("/templates/bulk", { method: "DELETE", body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
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
