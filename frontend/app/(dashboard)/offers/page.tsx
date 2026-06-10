import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import OffersPageClient from "./_components/offers-client";

export default async function OffersPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["offers"],
    queryFn: () => serverFetch("/offers"),
  });
  await queryClient.prefetchQuery({
    queryKey: ["jobs"],
    queryFn: () => serverFetch("/jobs"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OffersPageClient />
    </HydrationBoundary>
  );
}
