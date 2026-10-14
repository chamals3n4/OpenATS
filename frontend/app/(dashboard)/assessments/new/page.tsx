import { RoleGuard } from "@/components/guards/role-guard";
import CreateAssessmentPageClient from "./_components/create-assessment-client";

export default function NewAssessmentPage() {
  return (
    <RoleGuard allow="manager" redirectTo="/assessments">
      <CreateAssessmentPageClient />
    </RoleGuard>
  );
}
