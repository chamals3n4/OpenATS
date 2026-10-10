import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

// Serve the locally generated key instead of fetching a real JWKS. Everything
// else in `jose` stays real, so tokens are genuinely verified.
vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  // Import the holder, not the jwt helper: that helper imports `jose` itself,
  // which would deadlock the module graph from inside this factory.
  const { jwks } = await import("../helpers/jwks-holder");
  return {
    ...actual,
    createRemoteJWKSet: () => async () => jwks.publicKey,
  };
});

import { generateKeyPair } from "jose";
import { db } from "../../src/db";
import { users } from "../../src/db/schema/users";
import {
  AuthError,
  verifyAccessToken,
} from "../../src/shared/auth/verify-token";
import { authMiddleware } from "../../src/middlewares/auth.middleware";
import { initTestKeys, signToken } from "../helpers/jwt";

const SUFFIX = `auth-${Date.now()}`;

let otherKey: unknown;
let rsaKey: unknown;
const createdIds: number[] = [];

async function makeUser(
  tag: string,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const [row] = await db
    .insert(users)
    .values({
      name: `${tag} Tester`,
      firstName: tag,
      lastName: "Tester",
      email: `${tag}.${SUFFIX}@example.test`,
      role: "hiring_manager",
      ...overrides,
    })
    .returning();
  createdIds.push(row!.id);
  return row!;
}

function tokenFor(id: number, opts: Parameters<typeof signToken>[1] = {}) {
  return signToken({ sub: String(id) }, opts);
}

let activeId: number;

beforeAll(async () => {
  await initTestKeys();
  otherKey = (await generateKeyPair("EdDSA")).privateKey;
  rsaKey = (await generateKeyPair("RS256")).privateKey;

  activeId = (await makeUser("active")).id;
});

afterAll(async () => {
  if (createdIds.length) {
    await db.delete(users).where(inArray(users.id, createdIds));
  }
});

describe("verifyAccessToken - token validity", () => {
  it("accepts a well-formed token and resolves the user by id", async () => {
    const user = await verifyAccessToken(await tokenFor(activeId));

    expect(user.id).toBe(activeId);
    expect(user.role).toBe("hiring_manager");
  });

  it("rejects an expired token", async () => {
    const token = await tokenFor(activeId, { expiresIn: "-1s" });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWT_EXPIRED",
    });
  });

  it("rejects a token from a different issuer", async () => {
    const token = await tokenFor(activeId, {
      issuer: "https://attacker.example",
    });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "iss",
    });
  });

  it("rejects a token for a different audience", async () => {
    const token = await tokenFor(activeId, {
      audience: "https://other-app.example",
    });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
      claim: "aud",
    });
  });

  it("rejects a token signed by an unknown key", async () => {
    const token = await tokenFor(activeId, { key: otherKey });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
    });
  });

  it("rejects a token signed with an algorithm other than EdDSA", async () => {
    const token = await tokenFor(activeId, { key: rsaKey, alg: "RS256" });
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      code: "ERR_JOSE_ALG_NOT_ALLOWED",
    });
  });
});

describe("verifyAccessToken - subject", () => {
  it("rejects a token with no sub claim", async () => {
    await expect(verifyAccessToken(await signToken({}))).rejects.toMatchObject({
      status: 401,
    });
  });

  it.each(["abc", "1.5", "-1", "0", "1 or 1=1", "99999999999999"])(
    "rejects a sub that is not a user id (%s)",
    async (sub) => {
      const token = await signToken({ sub });
      const error = await verifyAccessToken(token).catch((e) => e);

      expect(error).toBeInstanceOf(AuthError);
      expect(error.status).toBe(401);
    },
  );

  it("rejects an id that matches no user", async () => {
    const gone = await makeUser("gone");
    await db.delete(users).where(eq(users.id, gone.id));

    await expect(
      verifyAccessToken(await tokenFor(gone.id)),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("does not provision a user from token claims", async () => {
    const stranger = `stranger.${SUFFIX}@example.test`;
    const token = await signToken({
      sub: "2147483647",
      email: stranger,
      given_name: "New",
      family_name: "Person",
      roles: ["super_admin"],
    });

    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      status: 401,
    });
    const rows = await db.select().from(users).where(eq(users.email, stranger));
    expect(rows).toHaveLength(0);
  });
});

describe("verifyAccessToken - account state comes from the row", () => {
  it("rejects a deactivated account", async () => {
    const user = await makeUser("inactive", { isActive: false });
    await expect(
      verifyAccessToken(await tokenFor(user.id)),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a banned account", async () => {
    const user = await makeUser("banned", { banned: true });
    await expect(
      verifyAccessToken(await tokenFor(user.id)),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a role the app does not recognise", async () => {
    const user = await makeUser("norole", { role: "viewer" });
    await expect(
      verifyAccessToken(await tokenFor(user.id)),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("ignores role claims in the token", async () => {
    const user = await makeUser("claims", { role: "interviewer" });
    const token = await signToken({
      sub: String(user.id),
      role: "super_admin",
      roles: ["super_admin"],
    });

    expect((await verifyAccessToken(token)).role).toBe("interviewer");
  });

  it("applies a role change and a deactivation to a token already issued", async () => {
    const user = await makeUser("changing", { role: "interviewer" });
    const token = await tokenFor(user.id);
    expect((await verifyAccessToken(token)).role).toBe("interviewer");

    await db
      .update(users)
      .set({ role: "super_admin" })
      .where(eq(users.id, user.id));
    expect((await verifyAccessToken(token)).role).toBe("super_admin");

    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, user.id));
    await expect(verifyAccessToken(token)).rejects.toMatchObject({
      status: 403,
    });
  });
});

function runAuth(headers: Record<string, string>) {
  return new Promise<{
    status: number | null;
    body: unknown;
    passed: boolean;
    user?: Request["user"];
  }>((resolve) => {
    let status: number | null = null;
    const req = { headers } as unknown as Request;
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
      resolve({ status: null, body: null, passed: true, user: req.user });

    void authMiddleware(req, res, next);
  });
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
    const token = await tokenFor(activeId, { expiresIn: "-1s" });
    const result = await runAuth({ authorization: `Bearer ${token}` });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: "Invalid or expired token" });
  });

  it("passes an AuthError status through instead of flattening it to 401", async () => {
    const user = await makeUser("mw-banned", { banned: true });
    const token = await tokenFor(user.id);
    const result = await runAuth({ authorization: `Bearer ${token}` });

    expect(result.status).toBe(403);
  });

  it("calls next and attaches the user row for a valid token", async () => {
    const token = await tokenFor(activeId);
    const result = await runAuth({ authorization: `Bearer ${token}` });

    expect(result.passed).toBe(true);
    expect(result.user).toMatchObject({ id: activeId, role: "hiring_manager" });
  });
});
