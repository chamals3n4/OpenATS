"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/server-fetch";
import { useRole } from "@/hooks/use-role";
import type { Job, Offer, Template, User, Department } from "@/types";

// Loads common lists once when the dashboard opens, so the first visit to each page is instant
export function DashboardPrefetch() {
  const queryClient = useQueryClient();
  const { role, isManager } = useRole();
  const ranRef = useRef(false);

  useEffect(() => {
    // Wait for the role, since some lists are managers only
    if (!role || ranRef.current) return;
    ranRef.current = true;

    void queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => serverFetch<{ data: Job[] }>("/jobs"),
      staleTime: 1000 * 60 * 5,
    });

    void queryClient.prefetchQuery({
      queryKey: ["templates"],
      queryFn: () => serverFetch<{ data: Template[] }>("/templates"),
      staleTime: 1000 * 60 * 10,
    });

    void queryClient.prefetchQuery({
      queryKey: ["departments"],
      queryFn: () => serverFetch<{ data: Department[] }>("/company/departments"),
      staleTime: 1000 * 60 * 10,
    });

    // The server refuses these for interviewers
    if (!isManager) return;

    void queryClient.prefetchQuery({
      queryKey: ["users"],
      queryFn: () => serverFetch<{ data: User[] }>("/users"),
      staleTime: 1000 * 60 * 10,
    });

    void queryClient.prefetchQuery({
      queryKey: ["offers", "all"],
      queryFn: () => serverFetch<{ data: Offer[] }>("/offers"),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient, role, isManager]);

  return null;
}
