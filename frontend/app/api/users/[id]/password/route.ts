import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-errors";
import { isValidPassword } from "@/lib/user-rules";
import {
  badRequest,
  errorResponse,
  getUser,
  parseUserId,
  requireSuperAdmin,
} from "@/lib/user-admin";

const ROUTE_LOG = "[API /users/[id]/password]";

// "Set new password": a super admin chooses the user's password directly.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    await requireSuperAdmin();
    const userId = parseUserId(id);
    if (userId === null) return badRequest("Invalid user ID");

    const body = (await req.json().catch(() => null)) as {
      password?: unknown;
    } | null;
    if (!isValidPassword(body?.password)) {
      return badRequest(
        `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
      );
    }

    // 404s for a missing or deactivated user before anything is changed.
    const target = await getUser(userId);
    if (!target.isActive) return badRequest("This user is deactivated.", 409);

    const requestHeaders = await headers();
    await auth.api.setUserPassword({
      body: { userId: String(userId), newPassword: body.password },
      headers: requestHeaders,
    });

    // Whoever was signed in with the old password is signed out.
    await auth.api.revokeUserSessions({
      body: { userId: String(userId) },
      headers: requestHeaders,
    });

    console.log(`${ROUTE_LOG} password set for user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} POST (id=${id})`, e);
  }
}
