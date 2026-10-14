import { RoleGuard } from "@/components/guards/role-guard";
import { NewTemplateClient } from "../_components/new-template-client";

export default function NewTemplatePage() {
  return (
    <RoleGuard allow="manager" redirectTo="/templates">
      <NewTemplateClient />
    </RoleGuard>
  );
}
