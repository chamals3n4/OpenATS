import { NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";
import { serverFetch } from "@/lib/auth-action";
import { assignAsgardeoRole } from "@/lib/asgardeo-roles";
import {
  getAsgardeoApiBase,
  getScimAccessToken,
  scimRequestHeaders,
} from "@/lib/asgardeo-scim-token";
import type { User } from "@/types";

const ROUTE_LOG = "[API /users]";

async function requireSignedIn() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Unauthorized");
}

export async function GET() {
  console.log(`${ROUTE_LOG} GET /api/users`);
  try {
    const data = await serverFetch<{ data: User[] }>("/users");
    console.log(`${ROUTE_LOG} fetched ${data.data.length} users`);
    return NextResponse.json(data.data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${ROUTE_LOG} GET error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  console.log(`${ROUTE_LOG} POST /api/users`);
  try {
    await requireSignedIn();
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
        role,
      }),
    });

    console.log(`${ROUTE_LOG} user created and stored in DB successfully`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${ROUTE_LOG} POST error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
