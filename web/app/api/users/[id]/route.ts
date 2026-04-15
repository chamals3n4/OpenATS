import { NextRequest, NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";
import { serverFetch } from "@/lib/auth-action";
import { assignAsgardeoRole, removeAsgardeoRole } from "@/lib/asgardeo-roles";
import {
  getAsgardeoApiBase,
  getScimAccessToken,
  scimRequestHeaders,
} from "@/lib/asgardeo-scim-token";
import type { User } from "@/types";

const ROUTE_LOG = "[API /users/[id]]";

async function requireSignedInAndScimToken() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Unauthorized");
  return getScimAccessToken();
}

async function getActorRole() {
  const me = await serverFetch<{ data: User }>("/users/me");
  return me.data.role;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  console.log(`${ROUTE_LOG} GET /api/users/${id}`);
  try {
    const data = await serverFetch<{ data: User }>(`/users/${id}`);
    return NextResponse.json(data.data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${ROUTE_LOG} GET error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  console.log(`${ROUTE_LOG} PATCH /api/users/${id}`);
  try {
    const scimToken = await requireSignedInAndScimToken();
    const actorRole = await getActorRole();
    const body = await req.json();
    const base = getAsgardeoApiBase();

    if (actorRole === "interviewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (actorRole === "hiring_manager" && body.role === "super_admin") {
      return NextResponse.json(
        { error: "Hiring managers cannot assign super admin role" },
        { status: 403 },
      );
    }

    const existing = await serverFetch<{
      data: User & { asgardeoUserId: string };
    }>(`/users/${id}`);
    const { asgardeoUserId, role: oldRole } = existing.data;
    console.log(
      `${ROUTE_LOG} updating asgardeoUserId=${asgardeoUserId}, oldRole=${oldRole}`,
    );

    const operations: { op: string; value: Record<string, unknown> }[] = [];
    const patchValue: Record<string, unknown> = {};

    if (body.firstName !== undefined || body.lastName !== undefined) {
      const nameValue: Record<string, string> = {};
      if (body.firstName !== undefined) nameValue.givenName = body.firstName;
      if (body.lastName !== undefined) nameValue.familyName = body.lastName;
      patchValue.name = nameValue;
    }

    if (body.email !== undefined) {
      patchValue.emails = [{ primary: true, value: body.email }];
    }

    if (Object.keys(patchValue).length > 0) {
      operations.push({
        op: "replace",
        value: patchValue,
      });
    }

    if (operations.length > 0) {
      const scimUrl = `${base}/scim2/Users/${asgardeoUserId}`;
      console.log(
        `${ROUTE_LOG} PATCH ${scimUrl} with ${operations.length} operation(s)`,
      );

      const scimRes = await fetch(scimUrl, {
        method: "PATCH",
        headers: scimRequestHeaders(scimToken, true),
        body: JSON.stringify({
          schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
          Operations: operations,
        }),
      });

      if (!scimRes.ok) {
        const errBody = await scimRes.text();
        console.error(
          `${ROUTE_LOG} SCIM PATCH failed — HTTP ${scimRes.status}: ${errBody}`,
        );
        return NextResponse.json(
          { error: errBody },
          { status: scimRes.status },
        );
      }
      console.log(`${ROUTE_LOG} SCIM PATCH successful`);
    } else {
      console.log(`${ROUTE_LOG} no profile fields to update in Asgardeo`);
    }

    if (body.role !== undefined && body.role !== oldRole) {
      console.log(
        `${ROUTE_LOG} role changed from "${oldRole}" → "${body.role}"`,
      );
      await removeAsgardeoRole(scimToken, asgardeoUserId, oldRole);
      await assignAsgardeoRole(scimToken, asgardeoUserId, body.role);
    }

    const updated = await serverFetch<{ data: User }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.role !== undefined && { role: body.role }),
      }),
    });

    console.log(`${ROUTE_LOG} user ${id} updated successfully`);
    return NextResponse.json(updated.data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : 500;
    console.error(`${ROUTE_LOG} PATCH error (id=${id}):`, msg);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  console.log(`${ROUTE_LOG} DELETE /api/users/${id}`);
  try {
    const scimToken = await requireSignedInAndScimToken();
    const actorRole = await getActorRole();
    const base = getAsgardeoApiBase();

    if (actorRole === "interviewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await serverFetch<{
      data: User & { asgardeoUserId: string };
    }>(`/users/${id}`);
    const { asgardeoUserId } = existing.data;
    console.log(`${ROUTE_LOG} deleting asgardeoUserId=${asgardeoUserId}`);

    const scimUrl = `${base}/scim2/Users/${asgardeoUserId}`;
    console.log(`${ROUTE_LOG} DELETE ${scimUrl}`);

    const scimRes = await fetch(scimUrl, {
      method: "DELETE",
      headers: scimRequestHeaders(scimToken, false),
    });

    if (!scimRes.ok) {
      const errBody = await scimRes.text();
      console.error(
        `${ROUTE_LOG} SCIM DELETE failed — HTTP ${scimRes.status}: ${errBody}`,
      );
      return NextResponse.json({ error: errBody }, { status: scimRes.status });
    }

    console.log(`${ROUTE_LOG} Asgardeo user deleted (HTTP 204)`);

    await serverFetch(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: false }),
    });

    console.log(`${ROUTE_LOG} user ${id} soft-deleted in DB`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "Unauthorized" ? 401 : 500;
    console.error(`${ROUTE_LOG} DELETE error (id=${id}):`, msg);
    return NextResponse.json({ error: msg }, { status });
  }
}
