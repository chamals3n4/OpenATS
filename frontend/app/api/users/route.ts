import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/auth-action";
import { requireRole } from "@/lib/require-role";
import { assignAsgardeoRole } from "@/lib/asgardeo-roles";
import {
  getAsgardeoApiBase,
  getScimAccessToken,
  scimRequestHeaders,
} from "@/lib/asgardeo-scim-token";
import type { User } from "@/types";

const ROUTE_LOG = "[API /users]";

type AppRole = "super_admin" | "hiring_manager" | "interviewer";
type DbUser = Omit<User, "role"> & { asgardeoUserId: string };

async function buildRoleMap(token: string): Promise<Map<string, AppRole>> {
  const base = getAsgardeoApiBase();
  const map = new Map<string, AppRole>();

  const roleDefs: [string | undefined, AppRole][] = [
    [process.env.ASGARDEO_SUPER_ADMIN_ROLE_ID, "super_admin"],
    [process.env.ASGARDEO_HIRING_MANAGER_ROLE_ID, "hiring_manager"],
    [process.env.ASGARDEO_INTERVIEWER_ROLE_ID, "interviewer"],
  ];

  await Promise.all(
    roleDefs.map(async ([roleId, appRole]) => {
      if (!roleId) return;
      try {
        const res = await fetch(`${base}/scim2/v2/Roles/${roleId}`, {
          headers: scimRequestHeaders(token, false),
        });
        if (!res.ok) return;
        const data = await res.json();
        for (const u of data.users ?? []) {
          if (u.value) map.set(u.value, appRole);
        }
      } catch {
        // non-fatal — user will just have no role shown
      }
    }),
  );

  return map;
}

export async function GET() {
  console.log(`${ROUTE_LOG} GET /api/users`);
  try {
    const [dbData, scimToken] = await Promise.all([
      serverFetch<{ data: DbUser[] }>("/users"),
      getScimAccessToken(),
    ]);

    const roleMap = await buildRoleMap(scimToken);

    const users: User[] = dbData.data.map(({ asgardeoUserId, ...u }) => ({
      ...u,
      role: roleMap.get(asgardeoUserId) ?? "interviewer",
    }));

    console.log(`${ROUTE_LOG} fetched ${users.length} users`);
    return NextResponse.json(users);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${ROUTE_LOG} GET error:`, msg);
    const status = msg === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  console.log(`${ROUTE_LOG} POST /api/users`);
  try {
    await requireRole("super_admin");
    const scimToken = await getScimAccessToken();
    const body = await req.json();
    const role = body.role ?? "interviewer";

    console.log(
      `${ROUTE_LOG} creating user — email: ${body.email}, role: ${role}, askPassword: ${!!body.askPassword}`,
    );

    const base = getAsgardeoApiBase();

    const scimBody: Record<string, unknown> = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      name: { givenName: body.firstName, familyName: body.lastName },
      userName: `DEFAULT/${body.userName}`,
      emails: [{ primary: true, value: body.email }],
    };
    if (body.askPassword) {
      scimBody["urn:scim:wso2:schema"] = { askPassword: true };
    } else if (body.password) {
      scimBody.password = body.password;
    }

    const scimUrl = `${base}/scim2/Users`;
    console.log(`${ROUTE_LOG} POST ${scimUrl}`);

    const scimRes = await fetch(scimUrl, {
      method: "POST",
      headers: scimRequestHeaders(scimToken, true),
      body: JSON.stringify(scimBody),
    });

    if (!scimRes.ok) {
      const err = await scimRes.json();
      console.error(
        `${ROUTE_LOG} Asgardeo create user failed — HTTP ${scimRes.status}:`,
        err,
      );
      return NextResponse.json(
        { error: err.detail ?? "Failed to create user in Asgardeo" },
        { status: scimRes.status },
      );
    }

    const scimUser = await scimRes.json();
    console.log(
      `${ROUTE_LOG} Asgardeo user created — asgardeoUserId: ${scimUser.id}`,
    );

    await assignAsgardeoRole(scimToken, scimUser.id, role);

    await serverFetch<{ data: unknown }>("/users", {
      method: "POST",
      body: JSON.stringify({
        asgardeoUserId: scimUser.id,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
      }),
    });

    console.log(`${ROUTE_LOG} user created and stored in DB successfully`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${ROUTE_LOG} POST error:`, msg);
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
