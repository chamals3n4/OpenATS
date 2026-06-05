import { getAsgardeoApiBase, scimRequestHeaders } from "./asgardeo-scim-token";

const ROLES_LOG = "[SCIM-ROLES]";

function getRoleId(role: string): string | null {
  switch (role) {
    case "super_admin":
      return process.env.ASGARDEO_SUPER_ADMIN_ROLE_ID!;
    case "hiring_manager":
      return process.env.ASGARDEO_HIRING_MANAGER_ROLE_ID!;
    case "interviewer":
      return process.env.ASGARDEO_INTERVIEWER_ROLE_ID!;
    default:
      console.warn(
        `${ROLES_LOG} unknown role "${role}" — skipping role operation`,
      );
      return null;
  }
}

export async function assignAsgardeoRole(
  token: string,
  asgardeoUserId: string,
  role: string,
): Promise<void> {
  const roleId = getRoleId(role);
  if (!roleId) return;

  const base = getAsgardeoApiBase();
  const url = `${base}/scim2/v2/Roles/${roleId}`;

  console.log(
    `${ROLES_LOG} assigning role "${role}" (${roleId}) to user ${asgardeoUserId}`,
  );

  const res = await fetch(url, {
    method: "PATCH",
    headers: scimRequestHeaders(token, true),
    body: JSON.stringify({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [
        { op: "add", path: "users", value: [{ value: asgardeoUserId }] },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      `${ROLES_LOG} failed to assign role "${role}" — HTTP ${res.status}: ${body}`,
    );
    throw new Error(
      `${ROLES_LOG} failed to assign role "${role}" (${res.status}): ${body}`,
    );
  }

  console.log(`${ROLES_LOG} role "${role}" assigned successfully`);
}

export async function removeAsgardeoRole(
  token: string,
  asgardeoUserId: string,
  role: string,
): Promise<void> {
  const roleId = getRoleId(role);
  if (!roleId) return;

  const base = getAsgardeoApiBase();
  const url = `${base}/scim2/v2/Roles/${roleId}`;

  console.log(
    `${ROLES_LOG} removing role "${role}" (${roleId}) from user ${asgardeoUserId}`,
  );

  const res = await fetch(url, {
    method: "PATCH",
    headers: scimRequestHeaders(token, true),
    body: JSON.stringify({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [
        { op: "remove", path: "users", value: [{ value: asgardeoUserId }] },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      `${ROLES_LOG} failed to remove role "${role}" — HTTP ${res.status}: ${body}`,
    );
    throw new Error(
      `${ROLES_LOG} failed to remove role "${role}" (${res.status}): ${body}`,
    );
  }

  console.log(`${ROLES_LOG} role "${role}" removed successfully`);
}
