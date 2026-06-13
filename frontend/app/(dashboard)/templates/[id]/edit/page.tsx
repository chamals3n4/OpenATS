import { EditTemplateClient } from "../../_components/edit-template-client";

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({
  params,
}: EditTemplatePageProps) {
  const { id } = await params;
  const templateId = parseInt(id);

  return <EditTemplateClient templateId={templateId} />;
}
