import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import CandidatesPageClient from "./_components/candidates-client";

export default async function CandidatesPage() {
  const queryClient = new QueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => serverFetch("/jobs"),
      staleTime: 1000 * 60 * 5,
    }),
    // Paginated list: matches ["candidates", "all", { page: 1, limit: 15 }]
    queryClient.prefetchQuery({
      queryKey: ["candidates", "all", { page: 1, limit: 15 }],
      queryFn: () => serverFetch("/candidates?page=1&limit=15"),
      staleTime: 1000 * 60 * 2,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CandidatesPageClient />
    </HydrationBoundary>
  );
}
