import {
  useQuery,
  useQueries,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type { Template, TemplateBody } from "@/types";
import { serverFetch } from "@/lib/server-fetch";
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
    mutationFn: ({
      id,
      context,
    }: {
      id: number;
      context: Record<string, string | number | undefined>;
    }) =>
      serverFetch<{
        data: { subject: string; bodyJson: TemplateBody; html: string };
      }>(`/templates/${id}/preview`, {
        method: "POST",
        body: JSON.stringify({ context }),
      }),
  });
}

/** One of the emails the app sends by itself, with the wording currently in use. */
export type SystemEmail = {
  purpose: string;
  label: string;
  description: string;
  /** What the app adds after the message when it is sent, or null. */
  appends: string | null;
  variables: { name: string; sample: string }[];
  subject: string;
  bodyHtml: string;
  customised: boolean;
  updatedAt: string | null;
};

export function useSystemEmails() {
  return useQuery({
    queryKey: ["templates", "system"],
    queryFn: () => serverFetch<{ data: SystemEmail[] }>("/templates/system"),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * An automatic email exactly as a candidate would receive it, built by the server from the
 * wording given (saved or not) and made-up details. The server builds the real email the same
 * way, so this is the email and not a drawing of it.
 */
export function useSystemEmailPreview(purpose: string, content: { subject: string; bodyHtml: string }) {
  return useQuery({
    queryKey: ["templates", "system", purpose, "preview", content.subject, content.bodyHtml],
    queryFn: () =>
      serverFetch<{ data: { subject: string; html: string } }>(`/templates/system/${purpose}/preview`, {
        method: "POST",
        body: JSON.stringify(content),
      }),
    // The last preview stays on screen while the next one loads, so typing does not make it blink.
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}

export function useSaveSystemEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ purpose, data }: { purpose: string; data: { subject: string; bodyHtml: string } }) =>
      serverFetch<{ data: { purpose: string } }>(`/templates/system/${purpose}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates", "system"] }),
  });
}

export function useResetSystemEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (purpose: string) =>
      serverFetch<{ data: { purpose: string } }>(`/templates/system/${purpose}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates", "system"] }),
  });
}
