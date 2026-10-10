import { isAuthMailConfigured } from "@/lib/auth-mail";
import { UserManagementClient } from "./_components/user-management-client";

export default function UserManagementPage() {
  // Read on the server: the Resend settings are not exposed to the browser.
  return <UserManagementClient inviteEmailEnabled={isAuthMailConfigured()} />;
}
