import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import AssessmentsPageClient from "./_components/assessments-client";

export default async function AssessmentsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["assessments"],
    queryFn: () => serverFetch("/assessments"),
  });
  await queryClient.prefetchQuery({
    queryKey: ["candidates"],
    queryFn: () => serverFetch("/candidates"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssessmentsPageClient />
    </HydrationBoundary>
  );
}
