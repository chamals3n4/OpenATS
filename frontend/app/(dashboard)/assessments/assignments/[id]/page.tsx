import { RoleGuard } from "@/components/guards/role-guard";
import { EditAssignmentClient } from "./edit-assignment-client";

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGuard allow="manager" redirectTo="/assessments?tab=assignments">
      <EditAssignmentClient id={Number(id)} />
    </RoleGuard>
  );
}
