import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, roles } from "./auth-permissions";

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles })],
});
