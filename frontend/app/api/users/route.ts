import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { serverFetch } from "@/lib/server-fetch";
import { isAuthMailConfigured } from "@/lib/auth/password-emails";
import { pool } from "@/lib/auth/db";
import { parseCreateUser } from "@/lib/users/rules";
import {
  badRequest,
  errorResponse,
  requireSuperAdmin,
  sendPasswordLink,
  unknowablePassword,
} from "@/lib/users/admin";
import type { User } from "@/types";

const ROUTE_LOG = "[API /users]";

// Roles are on the row, so the Express list is enough
export async function GET() {
  try {
    const data = await serverFetch<{ data: User[] }>("/users");
    return NextResponse.json(data.data);
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} GET`, e);
  }
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();

    const parsed = parseCreateUser(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    const { email, firstName, lastName, role, method, password } = parsed.value;

    if (method === "invite" && !isAuthMailConfigured()) {
      return badRequest(
        "Email sending is not configured on this server, so invitations cannot be sent. Set a password instead.",
      );
    }

    const requestHeaders = await headers();
    const name = `${firstName} ${lastName}`.trim();

    // Match case insensitive, old rows may have mixed case
    const existing = await pool.query<{ id: number; is_active: boolean }>(
      "select id, is_active from users where lower(email) = $1 limit 1",
      [email],
    );
    const row = existing.rows[0];

    if (row?.is_active) {
      return badRequest("A user with this email already exists.", 409);
    }

    if (row) {
      // Reactivate a deactivated user instead of adding a new one
      const userId = String(row.id);

      await auth.api.adminUpdateUser({
        body: {
          userId,
          data: {
            email,
            name,
            firstName,
            lastName,
            role,
            isActive: true,
            banned: false,
            banReason: null,
            banExpires: null,
          },
        },
        headers: requestHeaders,
      });

      // Replace the old password
      await auth.api.setUserPassword({
        body: { userId, newPassword: password ?? unknowablePassword() },
        headers: requestHeaders,
      });

      if (method === "invite") await sendPasswordLink(email);

      console.log(`${ROUTE_LOG} reactivated user ${userId} as ${role}`);
      return NextResponse.json({ success: true, reactivated: true }, { status: 200 });
    }

    // Invited users have no password until they use the link
    const created = await auth.api.createUser({
      body: {
        email,
        name,
        role,
        ...(method === "set" ? { password } : {}),
        data: { firstName, lastName },
      },
      headers: requestHeaders,
    });

    if (method === "invite") await sendPasswordLink(email);

    console.log(`${ROUTE_LOG} created user ${created.user.id} as ${role}`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} POST`, e);
  }
}
