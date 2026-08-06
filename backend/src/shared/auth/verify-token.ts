import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema/users";
import type { User } from "../../db/schema/users";

/**
 * Shared Asgardeo access-token verification, used by both the HTTP auth
 * middleware and the Socket.IO handshake. Keeping one implementation means
 * the two transports can never drift apart on who counts as authenticated.
 */

const JWKS = createRemoteJWKSet(new URL(process.env.ASGARDEO_JWKS_URL!));

export type AppRole = "super_admin" | "hiring_manager" | "interviewer";

export type AuthenticatedUser = User & { role: AppRole };

/** An authentication failure with the HTTP status it maps to. */
export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function collectRolesFromPayload(payload: Record<string, unknown>): string[] {
  const out: string[] = [];

  const rolesClaim = payload["roles"];
  if (Array.isArray(rolesClaim)) {
    for (const x of rolesClaim) {
      if (typeof x === "string" && x.trim()) out.push(x.trim());
    }
  } else if (typeof rolesClaim === "string" && rolesClaim.trim()) {
    out.push(rolesClaim.trim());
  }

  const wso2 = payload["http://wso2.org/claims/role"];
  if (Array.isArray(wso2)) {
    for (const x of wso2) {
      if (typeof x === "string" && x.trim()) out.push(x.trim());
    }
  } else if (typeof wso2 === "string" && wso2.trim()) {
    for (const part of wso2.split(",")) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }

  return out;
}

function mapToAppRole(names: string[]): AppRole | null {
  const normalized = names.map((s) =>
    s.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " "),
  );
  const has = (pred: (n: string) => boolean) => normalized.some(pred);

  // Exact name or group path only. A substring match would grant full
  // privileges to any role merely containing the words, e.g.
  // "super_admin_readonly" or "ex super admin".
  if (has((n) => n === "super admin" || n.endsWith("/super admin")))
    return "super_admin";
  if (has((n) => n === "hiring manager" || n.endsWith("/hiring manager")))
    return "hiring_manager";
  if (has((n) => n === "interviewer" || n.endsWith("/interviewer")))
    return "interviewer";

  return null;
}

/**
 * Verifies an Asgardeo JWT and resolves it to a local user.
 *
 * Throws `AuthError` for anything the caller should reject (bad claims, no
 * role, deactivated account) and lets `jose` errors and database errors
 * propagate unchanged so callers can tell a bad token from a broken server.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.ASGARDEO_ISSUER!,
  });

  const sub = payload.sub;
  if (!sub) {
    throw new AuthError(401, "Invalid token: missing sub claim");
  }

  // Role is the single source of truth from the JWT — never stored in DB.
  const role = mapToAppRole(
    collectRolesFromPayload(payload as Record<string, unknown>),
  );

  if (!role) {
    throw new AuthError(403, "No role assigned. Contact your administrator.");
  }

  const email = payload["email"] as string | undefined;
  const firstName = (payload["given_name"] as string | undefined) ?? "Unknown";
  const lastName = (payload["family_name"] as string | undefined) ?? "User";

  if (!email) {
    throw new AuthError(403, "Token missing required email claim");
  }

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.asgardeoUserId, sub))
    .limit(1);

  if (!user) {
    // The `sub` can change for an existing account when the Asgardeo tenant
    // or user is re-provisioned. Email is the stable identity, so reconcile
    // onto the existing row instead of colliding with its unique constraint.
    [user] = await db
      .update(users)
      .set({ asgardeoUserId: sub, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
  }

  if (!user) {
    // JIT provision — genuinely first login for this email
    [user] = await db
      .insert(users)
      .values({ asgardeoUserId: sub, firstName, lastName, email })
      .returning();

    if (!user) {
      throw new AuthError(500, "Failed to provision user");
    }
  }

  if (!user.isActive) {
    throw new AuthError(403, "User account is deactivated");
  }

  // Role comes from JWT — DB row has no role column
  return { ...user, role };
}
