import { NextRequest, NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";
import { serverFetch } from "@/lib/auth-action";
import { assignAsgardeoRole, removeAsgardeoRole } from "@/lib/asgardeo-roles";
import type { User } from "@/types";

async function getToken() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Unauthorized");
  return client.getAccessToken(sessionId);
}

const BASE = process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await serverFetch<{ data: User }>(`/users/${id}`);
    return NextResponse.json(data.data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const token = await getToken();
    const body = await req.json();

    // 1. Get current user from DB
    const existing = await serverFetch<{
      data: User & { asgardeoUserId: string };
    }>(`/users/${id}`);
    const { asgardeoUserId, role: oldRole } = existing.data;

    // 2. Update name/email in Asgardeo
    const operations: any[] = [];
    if (body.firstName !== undefined)
      operations.push({
        op: "replace",
        path: "name.givenName",
        value: body.firstName,
      });
    if (body.lastName !== undefined)
      operations.push({
        op: "replace",
        path: "name.familyName",
        value: body.lastName,
      });
    if (body.email !== undefined)
      operations.push({
        op: "replace",
        path: "emails[primary eq true].value",
        value: body.email,
      });

    if (operations.length > 0) {
      const scimRes = await fetch(`${BASE}/scim2/Users/${asgardeoUserId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          Operations: operations,
        }),
      });
      if (!scimRes.ok)
        return NextResponse.json(
          { error: await scimRes.text() },
          { status: scimRes.status },
        );
    }

    // 3. Sync Asgardeo role if changed
    if (body.role !== undefined && body.role !== oldRole) {
      await removeAsgardeoRole(token, asgardeoUserId, oldRole);
      await assignAsgardeoRole(token, asgardeoUserId, body.role);
    }

    // 4. Update DB
    const updated = await serverFetch<{ data: User }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.role !== undefined && { role: body.role }),
      }),
    });

    return NextResponse.json(updated.data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const token = await getToken();

    // 1. Get user from DB
    const existing = await serverFetch<{
      data: User & { asgardeoUserId: string };
    }>(`/users/${id}`);
    const { asgardeoUserId, role } = existing.data;

    // 2. Remove Asgardeo role
    await removeAsgardeoRole(token, asgardeoUserId, role);

    // 3. Delete from Asgardeo
    const scimRes = await fetch(`${BASE}/scim2/Users/${asgardeoUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!scimRes.ok)
      return NextResponse.json(
        { error: await scimRes.text() },
        { status: scimRes.status },
      );

    // 4. Soft delete in DB
    await serverFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: false }),
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
