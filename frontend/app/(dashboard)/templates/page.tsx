import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import TemplatesPageClient from "./_components/templates-client";

export default async function TemplatesPage() {
  const queryClient = new QueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["templates"],
      queryFn: () => serverFetch("/templates"),
      staleTime: 1000 * 60 * 5,
    }),
    // Paginated list: matches ["templates", "list", { page: 1, limit: 15 }]
    queryClient.prefetchQuery({
      queryKey: ["templates", "list", { page: 1, limit: 15 }],
      queryFn: () => serverFetch("/templates?page=1&limit=15"),
      staleTime: 1000 * 60 * 5,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TemplatesPageClient />
    </HydrationBoundary>
  );
}
