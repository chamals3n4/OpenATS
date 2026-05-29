"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { Job, Offer, Template, User } from "@/types";

/**
 * Prefetches only the most essential data once per session.
 * Heavy / page-specific data is loaded on demand by the page itself.
 *
 * IMPORTANT: The global QueryClient default `staleTime` is 5 min, so
 * prefetched data stays fresh and won't trigger redundant refetches
 * when a page mounts a useQuery with the same key.
 */
export function PrefetchProvider() {
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Core reference data — used on almost every page
    void queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => serverFetch<{ data: Job[] }>("/jobs"),
      staleTime: 1000 * 60 * 5,
    });

    void queryClient.prefetchQuery({
      queryKey: ["users"],
      queryFn: () => serverFetch<{ data: User[] }>("/users"),
      staleTime: 1000 * 60 * 10,
    });

    void queryClient.prefetchQuery({
      queryKey: ["templates"],
      queryFn: () => serverFetch<{ data: Template[] }>("/templates"),
      staleTime: 1000 * 60 * 10,
    });

    // Offers — shown on candidates sidebar, good to warm
    void queryClient.prefetchQuery({
      queryKey: ["offers", "all"],
      queryFn: () => serverFetch<{ data: Offer[] }>("/offers"),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  return null;
}
