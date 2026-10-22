import { isAuthMailConfigured } from "@/lib/auth/password-emails";
import { RoleGuard } from "@/components/guards/role-guard";
import { UserManagementClient } from "./_components/user-management-client";

export default function UserManagementPage() {
  // Read on the server, the SMTP settings are private
  return (
    <RoleGuard allow="super_admin" redirectTo="/settings/general">
      <UserManagementClient inviteEmailEnabled={isAuthMailConfigured()} />
    </RoleGuard>
  );
}
