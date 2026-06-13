import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import OffersPageClient from "./_components/offers-client";

export default async function OffersPage() {
  const queryClient = new QueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => serverFetch("/jobs"),
      staleTime: 1000 * 60 * 5,
    }),
    // Paginated list: matches ["offers", "list", { page: 1, limit: 15 }]
    queryClient.prefetchQuery({
      queryKey: ["offers", "list", { page: 1, limit: 15 }],
      queryFn: () => serverFetch("/offers?page=1&limit=15"),
      staleTime: 1000 * 60 * 2,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OffersPageClient />
    </HydrationBoundary>
  );
}
