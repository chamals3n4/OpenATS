import { ManagerGuard } from "@/components/guards/manager-guard";
import { NewTemplateClient } from "../_components/new-template-client";

export default function NewTemplatePage() {
  return (
    <ManagerGuard redirectTo="/templates">
      <NewTemplateClient />
    </ManagerGuard>
  );
}
