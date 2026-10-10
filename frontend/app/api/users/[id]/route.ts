import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { serverFetch } from "@/lib/auth-action";
import { lockoutReason, parseUpdateUser } from "@/lib/user-rules";
import {
  activeUsers,
  badRequest,
  errorResponse,
  getUser,
  parseUserId,
  requireSuperAdmin,
} from "@/lib/user-admin";

const ROUTE_LOG = "[API /users/[id]]";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function superAdminIds(): Promise<number[]> {
  return (await activeUsers())
    .filter((user) => user.role === "super_admin")
    .map((user) => user.id);
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const userId = parseUserId(id);
    if (userId === null) return badRequest("Invalid user ID");
    return NextResponse.json(await getUser(userId));
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} GET`, e);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const actorId = await requireSuperAdmin();
    const userId = parseUserId(id);
    if (userId === null) return badRequest("Invalid user ID");

    const parsed = parseUpdateUser(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    const { firstName, lastName, email, role } = parsed.value;

    const target = await getUser(userId);
    const requestHeaders = await headers();

    if (role !== undefined && role !== target.role) {
      const reason = lockoutReason({
        actorId,
        target,
        activeSuperAdminIds: await superAdminIds(),
        change: role,
      });
      if (reason) return badRequest(reason, 409);
    }

    const data: Record<string, string> = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      data.name =
        `${firstName ?? target.firstName} ${lastName ?? target.lastName}`.trim();
    }
    if (email !== undefined && email !== target.email) data.email = email;

    if (Object.keys(data).length > 0) {
      await auth.api.adminUpdateUser({
        body: { userId: String(userId), data },
        headers: requestHeaders,
      });
    }

    // Read from the row by Express on every request, so this applies to the
    // user's next request without a new sign-in.
    if (role !== undefined && role !== target.role) {
      await auth.api.setRole({
        body: { userId: String(userId), role },
        headers: requestHeaders,
      });
      console.log(`${ROUTE_LOG} user ${userId} role ${target.role} -> ${role}`);
    }

    return NextResponse.json(await getUser(userId));
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} PATCH (id=${id})`, e);
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const actorId = await requireSuperAdmin();
    const userId = parseUserId(id);
    if (userId === null) return badRequest("Invalid user ID");

    const target = await getUser(userId);

    const reason = lockoutReason({
      actorId,
      target,
      activeSuperAdminIds: await superAdminIds(),
      change: "deactivate",
    });
    if (reason) return badRequest(reason, 409);

    // Blocks sign-in and revokes every session. The row is never removed:
    // jobs, offers, templates and assessments point at it through created_by
    // with no ON DELETE rule, so a hard delete would fail or destroy history.
    await auth.api.banUser({
      body: { userId: String(userId), banReason: "Deactivated by an administrator" },
      headers: await headers(),
    });

    // Soft delete (is_active = false), which also drops them from user lists.
    await serverFetch(`/users/${userId}`, { method: "DELETE" });

    console.log(`${ROUTE_LOG} user ${userId} deactivated`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} DELETE (id=${id})`, e);
  }
}
