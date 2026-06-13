import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import { JobsPageClient } from "./_components/jobs-page-client";

export default async function JobsPage() {
  const queryClient = new QueryClient();

  await Promise.allSettled([
    // Non-paginated: used by dropdowns elsewhere
    queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => serverFetch("/jobs"),
      staleTime: 1000 * 60 * 5,
    }),
    queryClient.prefetchQuery({
      queryKey: ["departments"],
      queryFn: () => serverFetch("/company/departments"),
      staleTime: 1000 * 60 * 10,
    }),
    // Paginated list: matches the query key useJobsList uses on first render
    queryClient.prefetchQuery({
      queryKey: ["jobs", "list", { page: 1, limit: 15 }],
      queryFn: () => serverFetch("/jobs?page=1&limit=15"),
      staleTime: 1000 * 60 * 2,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JobsPageClient />
    </HydrationBoundary>
  );
}
