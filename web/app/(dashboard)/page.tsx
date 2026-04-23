import { OverviewClient } from "./overview-client";
import { serverFetch } from "@/lib/auth-action";
import type { AnalyticsReport, Department } from "@/types";

export default async function OverviewPage() {
  let initialDepartments: Department[] | undefined;
  let initialAnalyticsReport: AnalyticsReport | undefined;
  let initialAnalyticsUpdatedAt: number | undefined;

  try {
    const [departmentsRes, analyticsRes] = await Promise.all([
      serverFetch<{ data: Department[] }>("/company/departments"),
      serverFetch<{ data: AnalyticsReport }>("/reports/analytics?period=7d"),
    ]);

    initialDepartments = departmentsRes?.data ?? [];
    initialAnalyticsReport = analyticsRes?.data;
    initialAnalyticsUpdatedAt = Date.now();
  } catch {
    // Let client-side queries recover if server-side prefetch fails.
  }

  return (
    <OverviewClient
      initialDepartments={initialDepartments}
      initialAnalyticsReport={initialAnalyticsReport}
      initialAnalyticsUpdatedAt={initialAnalyticsUpdatedAt}
    />
  );
}
