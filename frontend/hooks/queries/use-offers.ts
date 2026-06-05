import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Offer, PublicOfferView } from "@/types";
import { serverFetch } from "@/lib/auth-action";

export function useOffers(jobId?: number) {
  return useQuery({
    queryKey: jobId ? ["offers", "job", jobId] : ["offers", "all"],
    queryFn: () =>
      serverFetch<{ data: Offer[] }>(
        jobId ? `/offers/job/${jobId}` : "/offers",
      ),
    enabled: jobId === undefined || !!jobId,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
}

export function useOffer(id: number) {
  return useQuery({
    queryKey: ["offers", id],
    queryFn: () => serverFetch<{ data: Offer }>(`/offers/${id}`),
    enabled: !!id,
    refetchInterval: 10_000,
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
