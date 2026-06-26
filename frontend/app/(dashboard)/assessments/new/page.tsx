import { ManagerGuard } from "@/components/manager-guard";
import CreateAssessmentPageClient from "./_components/create-assessment-client";

export default function NewAssessmentPage() {
  return (
    <ManagerGuard redirectTo="/assessments">
      <CreateAssessmentPageClient />
    </ManagerGuard>
  );
}
