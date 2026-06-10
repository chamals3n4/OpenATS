import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import CandidatesPageClient from "./_components/candidates-client";
export default async function CandidatesPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["jobs"],
    queryFn: () => serverFetch("/jobs"),
  });
  await queryClient.prefetchQuery({
    queryKey: ["candidates"],
    queryFn: () => serverFetch("/candidates"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CandidatesPageClient />
    </HydrationBoundary>
  );
}
