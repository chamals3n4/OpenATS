import { isAuthMailConfigured } from "@/lib/auth/password-emails";
import { UserManagementClient } from "./_components/user-management-client";

export default function UserManagementPage() {
  // Read on the server, Resend settings are private
  return <UserManagementClient inviteEmailEnabled={isAuthMailConfigured()} />;
}
