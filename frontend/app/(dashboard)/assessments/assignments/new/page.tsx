import { RoleGuard } from "@/components/guards/role-guard";
import { AssignmentFormPage } from "../../_components/assignments/assignment-form-page";

export default function NewAssignmentPage() {
  return (
    <RoleGuard allow="manager" redirectTo="/assessments?tab=assignments">
      <AssignmentFormPage assignment={null} />
    </RoleGuard>
  );
}
