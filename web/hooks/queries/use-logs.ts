import { useQuery, keepPreviousData, useMutation } from "@tanstack/react-query";
import type {
  ActiveLog,
  ActiveLogFilters,
  ActiveLogExportPayload,
} from "@/types";

export function useActiveLogs(
  filters: ActiveLogFilters,
  options?: {
    enabled?: boolean;
    live?: boolean;
  },
) {
  return useQuery({
    queryKey: ["logs", "active", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search?.trim()) params.set("search", filters.search.trim());
      if (filters.level) params.set("level", filters.level);
      if (filters.service) params.set("service", filters.service);
      if (filters.statusGroup) params.set("statusGroup", filters.statusGroup);
      if (filters.windowSize) params.set("windowSize", filters.windowSize);
      if (filters.limit) params.set("limit", String(filters.limit));
      if (filters.offset) params.set("offset", String(filters.offset));

      const res = await fetch(`/api/logs?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | ActiveLog[]
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? "Failed to load logs",
        );
      }

      return (json ?? []) as ActiveLog[];
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.live ? 4500 : false,
    refetchIntervalInBackground: false,
    staleTime: options?.live ? 4000 : 1000 * 60,
    // Keep showing the previous page of logs while a new filter/page fetch is
    // in flight – prevents the table from going blank between filter changes.
    placeholderData: keepPreviousData,
  });
}

export function useExportActiveLogs() {
  return useMutation({
    mutationFn: async ({
      format,
      filters,
    }: {
      format: "csv" | "json";
      filters?: Omit<ActiveLogFilters, "limit" | "offset">;
    }) => {
      const params = new URLSearchParams({ format });

      if (filters?.search?.trim()) params.set("search", filters.search.trim());
      if (filters?.level) params.set("level", filters.level);
      if (filters?.service) params.set("service", filters.service);
      if (filters?.statusGroup) params.set("statusGroup", filters.statusGroup);
      if (filters?.windowSize) params.set("windowSize", filters.windowSize);

      const res = await fetch(`/api/logs/export?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as
        | ActiveLogExportPayload
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? "Failed to export logs",
        );
      }

      return json as ActiveLogExportPayload;
    },
  });
}
