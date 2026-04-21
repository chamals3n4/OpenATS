"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type {
  Job,
  Candidate,
  CandidateDetail,
  Assessment,
  Offer,
  Template,
  User,
  AnalyticsReport,
} from "@/types";

export function PrefetchProvider() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => serverFetch<{ data: Job[] }>("/jobs"),
      staleTime: 1000 * 60 * 5,
    });

    // Fetch the candidates list then immediately prefetch each candidate's
    // detail so the side panel opens instantly without any visible loading.
    void queryClient
      .fetchQuery({
        queryKey: ["candidates", "all", { search: undefined }],
        queryFn: () => serverFetch<{ data: Candidate[] }>("/candidates"),
        staleTime: 0,
      })
      .then((res) => {
        for (const c of res.data ?? []) {
          void queryClient.prefetchQuery({
            queryKey: ["candidates", c.id],
            queryFn: () =>
              serverFetch<{ data: CandidateDetail }>(`/candidates/${c.id}`),
            staleTime: 30_000,
          });
        }
      });

    void queryClient.prefetchQuery({
      queryKey: ["offers", "all"],
      queryFn: () => serverFetch<{ data: Offer[] }>("/offers"),
      staleTime: 1000 * 60 * 5,
    });

    void queryClient.prefetchQuery({
      queryKey: ["assessments"],
      queryFn: () => serverFetch<{ data: Assessment[] }>("/assessments"),
      staleTime: 1000 * 60 * 5,
    });

    void queryClient.prefetchQuery({
      queryKey: ["users"],
      queryFn: () => serverFetch<{ data: User[] }>("/users"),
    });

    void queryClient.prefetchQuery({
      queryKey: ["templates"],
      queryFn: () => serverFetch<{ data: Template[] }>("/templates"),
      staleTime: 1000 * 60 * 5,
    });

    void queryClient.prefetchQuery({
      queryKey: ["settings", "allowed-origins"],
      queryFn: () =>
        serverFetch<{ data: { origins: string[] } }>(
          "/settings/allowed-origins",
        ),
      staleTime: 1000 * 30,
    });

    void queryClient.prefetchQuery({
      queryKey: ["reports", "analytics", "7d", "all"],
      queryFn: () =>
        serverFetch<{ data: AnalyticsReport }>("/reports/analytics?period=7d"),
      staleTime: 1000 * 60 * 5,
    });

    void queryClient.prefetchQuery({
      queryKey: [
        "logs",
        "active",
        {
          search: "",
          level: "all",
          service: "all",
          statusGroup: "all",
          windowSize: "24h",
          limit: 250,
          offset: 0,
        },
      ],
      queryFn: () =>
        fetch(
          "/api/logs?level=all&service=all&statusGroup=all&windowSize=24h&limit=250",
          { cache: "no-store" },
        ).then((r) => r.json()),
      staleTime: 2000,
    });
  }, []);

  return null;
}
