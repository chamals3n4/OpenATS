import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import { JobsPageClient } from "./_components/jobs-page-client";

export default async function JobsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["jobs"],
    queryFn: () => serverFetch("/jobs"),
  });
  await queryClient.prefetchQuery({
    queryKey: ["departments"],
    queryFn: () => serverFetch("/departments"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JobsPageClient />
    </HydrationBoundary>
  );
}
