"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { Job, Offer, Template, User } from "@/types";

export function PrefetchProvider() {
  const queryClient = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

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

    void queryClient.prefetchQuery({
      queryKey: ["offers", "all"],
      queryFn: () => serverFetch<{ data: Offer[] }>("/offers"),
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  return null;
}
