import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import { AnalyticsReport, AnalyticsExportPayload, AttentionReport } from "@/types";

export function useAnalyticsReport(
  period: "7d" | "30d" | "90d",
  departmentId?: number,
) {
  return useQuery({
    queryKey: ["reports", "analytics", period, departmentId ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (departmentId) params.set("departmentId", String(departmentId));
      return serverFetch<{ data: AnalyticsReport }>(
        `/reports/analytics?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });
}

/** Interviews, offers and candidates that need a manager's attention. Managers only. */
export function useAttentionReport(departmentId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["reports", "attention", departmentId ?? "all"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (departmentId) params.set("departmentId", String(departmentId));
      const query = params.toString();
      return serverFetch<{ data: AttentionReport }>(
        `/reports/attention${query ? `?${query}` : ""}`,
      );
    },
    enabled: options?.enabled !== false,
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

export function useExportAnalyticsReport() {
  return useMutation({
    mutationFn: async ({
      period,
      departmentId,
      format,
    }: {
      period: "7d" | "30d" | "90d";
      departmentId?: number;
      format: "csv" | "json";
    }) => {
      const params = new URLSearchParams({ period, format });
      if (departmentId) params.set("departmentId", String(departmentId));

      return serverFetch<{ data: AnalyticsExportPayload }>(
        `/reports/analytics/export?${params.toString()}`,
      );
    },
  });
}
