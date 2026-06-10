import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import TemplatesPageClient from "./_components/templates-client";

export default async function TemplatesPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["templates"],
    queryFn: () => serverFetch("/templates"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TemplatesPageClient />
    </HydrationBoundary>
  );
}
