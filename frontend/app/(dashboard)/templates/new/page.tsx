import { ManagerGuard } from "@/components/manager-guard";
import { NewTemplateClient } from "../_components/new-template-client";

export default function NewTemplatePage() {
  return (
    <ManagerGuard redirectTo="/templates">
      <NewTemplateClient />
    </ManagerGuard>
  );
}
