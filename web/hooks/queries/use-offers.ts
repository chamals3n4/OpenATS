import {
  useQuery,
  useQueries,
  keepPreviousData,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import type { Offer } from "@/types";
import { serverFetch } from "@/lib/auth-action";

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
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}
