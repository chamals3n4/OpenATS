import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { Offer, OfferWithRelations, PublicOfferView } from "@/types";
import { serverFetch } from "@/lib/auth-action";
import type { PaginationInfo } from "@/components/table/table-footer";

export type OfferListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  jobId?: number;
};

export function useOffers(jobId?: number) {
  return useQuery({
    queryKey: jobId ? ["offers", "job", jobId] : ["offers", "all"],
    queryFn: () =>
      serverFetch<{ data: OfferWithRelations[] }>(
        jobId ? `/offers/job/${jobId}` : "/offers",
      ),
    enabled: jobId === undefined || !!jobId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useOffer(id: number) {
  return useQuery({
    queryKey: ["offers", id],
    queryFn: () => serverFetch<{ data: Offer }>(`/offers/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
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
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      if (variables.jobId) {
        queryClient.invalidateQueries({
          queryKey: ["offers", "job", variables.jobId],
        });
      }
      if (variables.candidateId) {
        queryClient.invalidateQueries({
          queryKey: ["candidates", variables.candidateId],
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
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["offers", variables.offerId],
      });
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Offer["status"] }) =>
      serverFetch<{ data: Offer }>(`/offers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useOffersList(params: OfferListParams = {}) {
  return useQuery({
    queryKey: ["offers", "list", params],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 15) });
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      if (params.jobId) qs.set("jobId", String(params.jobId));
      return serverFetch<{
        data: OfferWithRelations[];
        pagination: PaginationInfo;
      }>(`/offers?${qs}`);
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      serverFetch(`/offers/${offerId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useBulkDeleteOffers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      serverFetch<{ count: number }>("/offers/bulk", { method: "DELETE", body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useSendOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      serverFetch<{ data: Offer }>(`/offers/${offerId}/send`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useAcceptOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      serverFetch<{ data: Offer }>(`/offers/${offerId}/accept`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeclineOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      serverFetch<{ data: Offer }>(`/offers/${offerId}/decline`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useMarkOfferAsHired() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      serverFetch<{ data: { candidate: { id: number } } }>(
        `/offers/${offerId}/mark-hired`,
        {
          method: "POST",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function fetchPublicOffer(
  token: string,
): Promise<PublicOfferView> {
  const response = await fetch(`${API_BASE}/public/offers/${token}`, {
    cache: "no-store",
  });

  const payload = (await response.json()) as
    | { data: PublicOfferView }
    | { error?: string };

  if (!response.ok || !("data" in payload)) {
    const message =
      "error" in payload && payload.error
        ? payload.error
        : "Failed to fetch offer";
    throw new Error(message);
  }

  return payload.data;
}

export async function acceptPublicOffer(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/public/offers/${token}/accept`, {
    method: "POST",
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to accept offer");
  }
}

export async function declinePublicOffer(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/public/offers/${token}/decline`, {
    method: "POST",
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to decline offer");
  }
}
