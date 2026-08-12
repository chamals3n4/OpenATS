import { generateKeyPair, SignJWT } from "jose";
import { jwks } from "./jwks-holder";

export { jwks };

let privateKey: unknown;

export async function initTestKeys() {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  jwks.publicKey = pair.publicKey;
}

export type Claims = Record<string, unknown>;

export async function signToken(
  claims: Claims,
  opts: { issuer?: string; expiresIn?: string; key?: unknown } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? process.env.ASGARDEO_ISSUER!)
    .setExpirationTime(opts.expiresIn ?? "5m")
    .sign((opts.key ?? privateKey) as Parameters<SignJWT["sign"]>[0]);
}

// A token the auth middleware accepts. The user is provisioned on first use.
export async function bearer(opts: {
  sub: string;
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}) {
  const token = await signToken({
    sub: opts.sub,
    email: opts.email,
    given_name: opts.firstName ?? "Test",
    family_name: opts.lastName ?? "User",
    roles: [opts.role ?? "super_admin"],
  });
  return `Bearer ${token}`;
}
