import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import { EditTemplateClient } from "../../_components/edit-template-client";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const { id } = await params;
  const templateId = parseInt(id);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["templates", templateId],
    queryFn: () => serverFetch(`/templates/${templateId}`),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EditTemplateClient templateId={templateId} />
    </HydrationBoundary>
  );
}
