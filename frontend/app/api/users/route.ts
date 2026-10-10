import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { serverFetch } from "@/lib/auth-action";
import { isAuthMailConfigured } from "@/lib/auth-mail";
import { pool } from "@/lib/db";
import { parseCreateUser } from "@/lib/user-rules";
import {
  badRequest,
  errorResponse,
  requireSuperAdmin,
  sendPasswordLink,
  unknowablePassword,
} from "@/lib/user-admin";
import type { User } from "@/types";

const ROUTE_LOG = "[API /users]";

// Roles are a column on the row now, so the Express list is the whole answer.
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

    // Matched without regard to case: rows from before built-in sign-in may
    // hold a mixed-case email.
    const existing = await pool.query<{ id: number; is_active: boolean }>(
      "select id, is_active from users where lower(email) = $1 limit 1",
      [email],
    );
    const row = existing.rows[0];

    if (row?.is_active) {
      return badRequest("A user with this email already exists.", 409);
    }

    if (row) {
      // A deactivated user: bring the same row back rather than adding a
      // duplicate, so their id and everything linked to it are kept.
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

      // Always replaced, so the password from before deactivation stops working.
      await auth.api.setUserPassword({
        body: { userId, newPassword: password ?? unknowablePassword() },
        headers: requestHeaders,
      });

      if (method === "invite") await sendPasswordLink(email);

      console.log(`${ROUTE_LOG} reactivated user ${userId} as ${role}`);
      return NextResponse.json({ success: true, reactivated: true }, { status: 200 });
    }

    // An invited user gets no password at all: no credential exists until
    // they follow the link, and that is also what selects the "Set your
    // password" email over the "Reset your password" one.
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
