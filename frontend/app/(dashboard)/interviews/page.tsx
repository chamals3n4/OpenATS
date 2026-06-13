import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import InterviewsClient from "./_components/interviews-client";

export default async function InterviewsPage() {
  const queryClient = new QueryClient();

  await Promise.allSettled([
    // Initial filter is {} so the key is ["interviews", {}]
    queryClient.prefetchQuery({
      queryKey: ["interviews", {}],
      queryFn: () => serverFetch("/interviews"),
      staleTime: 1000 * 60 * 2,
    }),
    queryClient.prefetchQuery({
      queryKey: ["departments"],
      queryFn: () => serverFetch("/company/departments"),
      staleTime: 1000 * 60 * 10,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InterviewsClient />
    </HydrationBoundary>
  );
}
