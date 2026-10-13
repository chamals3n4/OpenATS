import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { badRequest, errorResponse } from "@/lib/user-admin";
import { parseOwnProfile } from "@/lib/user-rules";

/**
 * A signed-in person changing their own name. Anyone may do this for themselves, whatever their
 * role. Nothing else can be changed here: the email and the role are a super admin's to set
 * (PATCH /api/users/:id).
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return badRequest("You are not signed in.", 401);

    const parsed = parseOwnProfile(await req.json().catch(() => null));
    if (!parsed.ok) return badRequest(parsed.error);
    const { firstName, lastName } = parsed.value;

    // Better Auth only ever updates the user the session belongs to, so there is no id to pass
    // and no way to reach another account from here.
    await auth.api.updateUser({
      body: { firstName, lastName, name: `${firstName} ${lastName}`.trim() },
      headers: await headers(),
    });

    return NextResponse.json({ data: { firstName, lastName } });
  } catch (e: unknown) {
    return errorResponse("[API /users/me] PATCH", e);
  }
}
