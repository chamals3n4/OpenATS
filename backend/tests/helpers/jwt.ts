import { generateKeyPair, SignJWT } from "jose";
import { db } from "../../src/db";
import { users } from "../../src/db/schema/users";
import type { User } from "../../src/db/schema/users";
import { jwks } from "./jwks-holder";

export { jwks };

let privateKey: unknown;

// Better Auth signs with EdDSA (Ed25519), so the test keys do too.
export async function initTestKeys() {
  const pair = await generateKeyPair("EdDSA");
  privateKey = pair.privateKey;
  jwks.publicKey = pair.publicKey;
}

export type Claims = Record<string, unknown>;

export async function signToken(
  claims: Claims,
  opts: {
    issuer?: string;
    audience?: string;
    expiresIn?: string;
    key?: unknown;
    alg?: string;
  } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: opts.alg ?? "EdDSA" })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? process.env.AUTH_ISSUER!)
    .setAudience(opts.audience ?? process.env.AUTH_ISSUER!)
    .setExpirationTime(opts.expiresIn ?? "5m")
    .sign((opts.key ?? privateKey) as Parameters<SignJWT["sign"]>[0]);
}

// Creates a user and a token the auth middleware accepts for them. Users are
// no longer provisioned on first use, so the row is inserted here; the token
// only carries its id, and role and status are read from the row.
export async function bearer(opts: {
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ authorization: string; user: User }> {
  const firstName = opts.firstName ?? "Test";
  const lastName = opts.lastName ?? "User";

  const [user] = await db
    .insert(users)
    .values({
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email: opts.email,
      role: opts.role ?? "super_admin",
    })
    .returning();

  const token = await signToken({ sub: String(user!.id) });
  return { authorization: `Bearer ${token}`, user: user! };
}
