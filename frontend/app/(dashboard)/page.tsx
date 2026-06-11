import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { AnalyticsReport, Department } from "@/types";
import { OverviewClient } from "./overview-client";

export default async function OverviewPage() {
  const queryClient = new QueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["reports", "analytics", "7d", "all"],
      queryFn: () =>
        serverFetch<{ data: AnalyticsReport }>("/reports/analytics?period=7d"),
      staleTime: 1000 * 60 * 5,
    }),
    queryClient.prefetchQuery({
      queryKey: ["departments"],
      queryFn: () =>
        serverFetch<{ data: Department[] }>("/company/departments"),
      staleTime: 1000 * 60 * 10,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OverviewClient />
    </HydrationBoundary>
  );
}
