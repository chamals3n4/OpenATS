import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Used by server and client, so no server only imports
export const ac = createAccessControl(defaultStatements);

export const roles = {
  super_admin: ac.newRole({ ...adminAc.statements }),
  hiring_manager: ac.newRole({ user: [], session: [] }),
  interviewer: ac.newRole({ user: [], session: [] }),
};
