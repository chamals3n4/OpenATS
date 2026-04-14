import { OverviewClient } from "./overview-client";
import { serverFetch } from "@/lib/auth-action";
import type { AnalyticsReport, Department } from "@/types";

export default async function OverviewPage() {
  const period = "7d";
  const [departmentsRes, analyticsRes] = await Promise.allSettled([
    serverFetch<{ data: Department[] }>("/company/departments"),
    serverFetch<{ data: AnalyticsReport }>(`/reports/analytics?period=${period}`),
  ]);

  const initialDepartments =
    departmentsRes.status === "fulfilled" ? departmentsRes.value.data : undefined;
  const initialAnalyticsReport =
    analyticsRes.status === "fulfilled" ? analyticsRes.value.data : undefined;

  return (
    <OverviewClient
      initialDepartments={initialDepartments}
      initialAnalyticsReport={initialAnalyticsReport}
      initialAnalyticsUpdatedAt={Date.now()}
    />
  );
}
