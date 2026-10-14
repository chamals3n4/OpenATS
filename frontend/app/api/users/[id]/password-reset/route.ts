import { NextRequest, NextResponse } from "next/server";
import { isAuthMailConfigured } from "@/lib/auth/password-emails";
import {
  badRequest,
  errorResponse,
  getUser,
  parseUserId,
  requireSuperAdmin,
  sendPasswordLink,
} from "@/lib/users/admin";

const ROUTE_LOG = "[API /users/[id]/password-reset]";

// Email the user a reset link
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    await requireSuperAdmin();
    const userId = parseUserId(id);
    if (userId === null) return badRequest("Invalid user ID");

    if (!isAuthMailConfigured()) {
      return badRequest(
        "Email sending is not configured on this server. Set a new password instead.",
      );
    }

    const target = await getUser(userId);
    if (!target.isActive) return badRequest("This user is deactivated.", 409);

    await sendPasswordLink(target.email);

    console.log(`${ROUTE_LOG} reset link sent for user ${userId}`);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return errorResponse(`${ROUTE_LOG} POST (id=${id})`, e);
  }
}
