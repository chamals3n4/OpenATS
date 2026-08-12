import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { inArray } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

const jwks = vi.hoisted(() => ({ publicKey: null as unknown }));

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet: () => async () => jwks.publicKey,
  };
});

import { generateKeyPair, SignJWT } from "jose";
import { db } from "../../src/db";
import { users } from "../../src/db/schema/users";
import {
  AuthError,
  verifyAccessToken,
} from "../../src/shared/auth/verify-token";
import { authMiddleware } from "../../src/middlewares/auth.middleware";

const SUFFIX = `auth-${Date.now()}`;
const ISSUER = process.env.ASGARDEO_ISSUER!;

let privateKey: unknown;
let otherKey: unknown;
const createdEmails: string[] = [];

function email(tag: string) {
  return `${tag}.${SUFFIX}@example.test`;
}

type Claims = Record<string, unknown>;

async function sign(
  claims: Claims,
  opts: { issuer?: string; expiresIn?: string; key?: unknown } = {},
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setIssuer(opts.issuer ?? ISSUER)
    .setExpirationTime(opts.expiresIn ?? "5m")
    .sign((opts.key ?? privateKey) as Parameters<SignJWT["sign"]>[0]);
}

function validClaims(tag: string, overrides: Claims = {}): Claims {
  return {
    sub: `${SUFFIX}-${tag}`,
    email: email(tag),
    given_name: "Test",
    family_name: "User",
    roles: ["hiring_manager"],
    ...overrides,
  };
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  jwks.publicKey = pair.publicKey;

  const other = await generateKeyPair("RS256");
  otherKey = other.privateKey;
});

afterAll(async () => {
  if (createdEmails.length) {
    await db.delete(users).where(inArray(users.email, createdEmails));
  }
});

describe("verifyAccessToken - token validity", () => {
  it("accepts a well-formed token and resolves the local user", async () => {
    createdEmails.push(email("happy"));
    const user = await verifyAccessToken(await sign(validClaims("happy")));

    expect(user.email).toBe(email("happy"));
    expect(user.role).toBe("hiring_manager");
    expect(user.asgardeoUserId).toBe(`${SUFFIX}-happy`);
  });

  it("rejects an expired token", async () => {
    const token = await sign(validClaims("expired"), { expiresIn: "-1s" });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWT_EXPIRED",
    });
  });

  it("rejects a token from a different issuer", async () => {
    const token = await sign(validClaims("issuer"), {
      issuer: "https://attacker.example",
    });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "iss",
    });
  });

  it("rejects a token signed by an unknown key", async () => {
    const token = await sign(validClaims("badkey"), { key: otherKey });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
    });
  });
});

describe("verifyAccessToken - claims", () => {
  it("rejects a token with no sub claim", async () => {
    const claims = validClaims("nosub");
    delete claims.sub;
    await expect(verifyAccessToken(await sign(claims))).rejects.toThrow(
      AuthError,
    );
  });

  it("rejects a token with no email claim", async () => {
    const claims = validClaims("noemail");
    delete claims.email;
    await expect(verifyAccessToken(await sign(claims))).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rejects a role the app does not recognise", async () => {
    const token = await sign(validClaims("norole", { roles: ["viewer"] }));
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("reads the role from the wso2 claim as well", async () => {
    createdEmails.push(email("wso2"));
    const token = await sign(
      validClaims("wso2", {
        roles: undefined,
        "http://wso2.org/claims/role": "everyone,Application/x,super admin",
      }),
    );
    const user = await verifyAccessToken(token);
    expect(user.role).toBe("super_admin");
  });
});

describe("verifyAccessToken - user provisioning", () => {
  it("provisions a user on first login", async () => {
    createdEmails.push(email("new"));
    const user = await verifyAccessToken(await sign(validClaims("new")));

    expect(user.id).toBeTypeOf("number");
    expect(user.firstName).toBe("Test");
  });

  it("returns the same row on a second login", async () => {
    createdEmails.push(email("repeat"));
    const first = await verifyAccessToken(await sign(validClaims("repeat")));
    const second = await verifyAccessToken(await sign(validClaims("repeat")));

    expect(second.id).toBe(first.id);
  });

  it("reconciles onto the existing row when sub changes for a known email", async () => {
    createdEmails.push(email("moved"));
    const original = await verifyAccessToken(await sign(validClaims("moved")));

    const withNewSub = await verifyAccessToken(
      await sign(validClaims("moved", { sub: `${SUFFIX}-moved-changed` })),
    );

    expect(withNewSub.id).toBe(original.id);
    expect(withNewSub.asgardeoUserId).toBe(`${SUFFIX}-moved-changed`);
  });

  it("rejects a deactivated account", async () => {
    createdEmails.push(email("inactive"));
    await db.insert(users).values({
      asgardeoUserId: `${SUFFIX}-inactive`,
      firstName: "In",
      lastName: "Active",
      email: email("inactive"),
      isActive: false,
    });

    await expect(
      verifyAccessToken(await sign(validClaims("inactive"))),
    ).rejects.toMatchObject({ status: 403 });
  });
});

function runAuth(headers: Record<string, string>) {
  return new Promise<{ status: number | null; body: unknown; passed: boolean }>(
    (resolve) => {
      let status: number | null = null;
      const res = {
        status(code: number) {
          status = code;
          return this;
        },
        json(body: unknown) {
          resolve({ status, body, passed: false });
          return this;
        },
      } as unknown as Response;

      const next: NextFunction = () =>
        resolve({ status: null, body: null, passed: true });

      void authMiddleware({ headers } as unknown as Request, res, next);
    },
  );
}

describe("authMiddleware", () => {
  it("rejects a request with no authorization header", async () => {
    const result = await runAuth({});
    expect(result.status).toBe(401);
    expect(result.passed).toBe(false);
  });

  it("rejects a header that is not a Bearer token", async () => {
    const result = await runAuth({ authorization: "Basic abc123" });
    expect(result.status).toBe(401);
  });

  it("maps a bad token to 401 without leaking the reason", async () => {
    const token = await sign(validClaims("mw-expired"), { expiresIn: "-1s" });
    const result = await runAuth({ authorization: `Bearer ${token}` });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: "Invalid or expired token" });
  });

  it("passes an AuthError status through instead of flattening it to 401", async () => {
    const token = await sign(validClaims("mw-norole", { roles: ["viewer"] }));
    const result = await runAuth({ authorization: `Bearer ${token}` });

    expect(result.status).toBe(403);
  });

  it("calls next and attaches the user for a valid token", async () => {
    createdEmails.push(email("mw-ok"));
    const token = await sign(validClaims("mw-ok"));
    const result = await runAuth({ authorization: `Bearer ${token}` });

    expect(result.passed).toBe(true);
  });
});
