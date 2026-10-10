import { generateKeyPair, SignJWT } from "jose";
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

// A token the auth middleware accepts. The user row must already exist: the
// token only carries its id, and role and status come from the row.
export async function bearer(userId: number) {
  const token = await signToken({ sub: String(userId) });
  return `Bearer ${token}`;
}
