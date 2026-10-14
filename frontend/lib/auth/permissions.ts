import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Shared by the server options and the browser client, so it must not import
// anything server-only (pg, env secrets).
export const ac = createAccessControl(defaultStatements);

export const roles = {
  super_admin: ac.newRole({ ...adminAc.statements }),
  hiring_manager: ac.newRole({ user: [], session: [] }),
  interviewer: ac.newRole({ user: [], session: [] }),
};
