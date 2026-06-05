import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "../db";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";

const JWKS = createRemoteJWKSet(new URL(process.env.ASGARDEO_JWKS_URL!));

type AppRole = "super_admin" | "hiring_manager" | "interviewer";

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

function normalizeRoleLabel(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

function mapAsgardeoRoleNamesToAppRole(names: string[]): AppRole | null {
  const normalized = names.map(normalizeRoleLabel);

  const has = (pred: (n: string) => boolean) => normalized.some(pred);

  if (
    has(
      (n) =>
        n === "super admin" ||
        n.endsWith("/super admin") ||
        n.includes("super admin"),
    )
  ) {
    return "super_admin";
  }
  if (has((n) => n === "hiring manager" || n.endsWith("/hiring manager"))) {
    return "hiring_manager";
  }
  if (has((n) => n === "interviewer" || n.endsWith("/interviewer"))) {
    return "interviewer";
  }

  return null;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.ASGARDEO_ISSUER!,
    });

    const sub = payload.sub;
    if (!sub) {
      res.status(401).json({ error: "Invalid token: missing sub claim" });
      return;
    }

    const tokenRoleNames = collectRolesFromPayload(
      payload as Record<string, unknown>,
    );
    const roleFromToken = mapAsgardeoRoleNamesToAppRole(tokenRoleNames);

    const email = payload["email"] as string | undefined;
    const firstName =
      (payload["given_name"] as string | undefined) ?? "Unknown";
    const lastName = (payload["family_name"] as string | undefined) ?? "User";

    if (!email) {
      res.status(403).json({ error: "Token missing required email claim" });
      return;
    }

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.asgardeoUserId, sub))
      .limit(1);

    if (!user) {
      // first login — provision; default interviewer if token has no mappable roles
      const role = roleFromToken ?? "interviewer";
      [user] = await db
        .insert(users)
        .values({ asgardeoUserId: sub, firstName, lastName, email, role })
        .returning();

      if (!user) {
        res.status(500).json({ error: "Failed to provision user" });
        return;
      }
    } else {
      // existing user
      const [updated] = await db
        .update(users)
        .set({
          ...(roleFromToken !== null ? { role: roleFromToken } : {}),
          firstName,
          lastName,
          email,
          updatedAt: new Date(),
        })
        .where(eq(users.asgardeoUserId, sub))
        .returning();

      if (!updated) {
        res.status(500).json({ error: "Failed to sync user" });
        return;
      }

      user = updated;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "User account is deactivated" });
      return;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[authMiddleware] error:", msg);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
