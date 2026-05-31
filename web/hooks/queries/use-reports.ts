import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import { AnalyticsReport, AnalyticsExportPayload } from "@/types";

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
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
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
