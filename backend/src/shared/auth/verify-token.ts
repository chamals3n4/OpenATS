import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema/users";
import type { User } from "../../db/schema/users";

/**
 * Shared access-token verification, used by both the HTTP auth middleware and
 * the Socket.IO handshake. Keeping one implementation means the two
 * transports can never drift apart on who counts as authenticated.
 *
 * Tokens are short-lived JWTs issued by Better Auth in the Next.js server and
 * verified here against its JWKS endpoint.
 */

// Fetched lazily on the first verification and cached, so the API can start
// before the frontend is up.
const JWKS = createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URL!));

const APP_ROLES = ["super_admin", "hiring_manager", "interviewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type AuthenticatedUser = Omit<User, "role"> & { role: AppRole };

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

function isAppRole(role: string): role is AppRole {
  return (APP_ROLES as readonly string[]).includes(role);
}

// `users.id` is a Postgres serial, so anything else can never match a row.
const MAX_SERIAL = 2147483647;

function parseUserId(sub: string | undefined): number | null {
  if (!sub || !/^[1-9]\d*$/.test(sub)) return null;
  const id = Number(sub);
  return id <= MAX_SERIAL ? id : null;
}

/**
 * Verifies an OpenATS-issued JWT and resolves it to a local user.
 *
 * The token only identifies the user. Role, active and banned state are read
 * from the row on every call, so a change applies on the next request
 * instead of after the token expires.
 *
 * Throws `AuthError` for anything the caller should reject (unknown user,
 * deactivated or banned account) and lets `jose` errors and database errors
 * propagate unchanged so callers can tell a bad token from a broken server.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AuthenticatedUser> {
  const issuer = process.env.AUTH_ISSUER!;

  // Better Auth signs with EdDSA (Ed25519) and sets both issuer and audience
  // to its base URL.
  const { payload } = await jwtVerify(token, JWKS, {
    issuer,
    audience: issuer,
    algorithms: ["EdDSA"],
  });

  const id = parseUserId(payload.sub);
  if (id === null) {
    throw new AuthError(401, "Invalid token: missing or malformed sub claim");
  }

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (!user) {
    throw new AuthError(401, "Invalid token: unknown user");
  }

  if (!user.isActive) {
    throw new AuthError(403, "User account is deactivated");
  }

  if (user.banned) {
    throw new AuthError(403, "User account is banned");
  }

  if (!isAppRole(user.role)) {
    throw new AuthError(403, "No role assigned. Contact your administrator.");
  }

  return { ...user, role: user.role };
}
