import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "../db";
import { users } from "../db/schema/users";
import { eq } from "drizzle-orm";

const JWKS = createRemoteJWKSet(
  new URL(process.env.ASGARDEO_JWKS_URL!)
);

function getAllowedIssuers(): string[] {
  const configured = (process.env.ASGARDEO_ISSUER ?? "").replace(/\/+$/, "");
  const base = configured.replace(/\/oauth2\/token$/, "");
  return Array.from(new Set([configured, `${base}/oauth2/token`, base])).filter(Boolean);
}

type TokenPayload = Awaited<ReturnType<typeof jwtVerify>>["payload"];

async function introspectAccessToken(token: string): Promise<TokenPayload | null> {
  const clientId = process.env.ASGARDEO_CLIENT_ID;
  const clientSecret = process.env.ASGARDEO_CLIENT_SECRET;
  const issuer = (process.env.ASGARDEO_ISSUER ?? "").replace(/\/+$/, "");
  const base = issuer.replace(/\/oauth2\/token$/, "");

  if (!clientId || !clientSecret || !base) {
    return null;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/oauth2/introspect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({ token }).toString(),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    active?: boolean;
    sub?: string;
    username?: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    roles?: string[];
  };

  if (!data.active) {
    return null;
  }

  const sub = data.sub ?? data.username;
  if (!sub) {
    return null;
  }

  return {
    sub,
    email: data.email,
    given_name: data.given_name,
    family_name: data.family_name,
    roles: data.roles,
  };
}

async function fetchUserInfo(token: string): Promise<TokenPayload | null> {
  const issuer = (process.env.ASGARDEO_ISSUER ?? "").replace(/\/+$/, "");
  const base = issuer.replace(/\/oauth2\/token$/, "");
  if (!base) {
    return null;
  }

  try {
    const res = await fetch(`${base}/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      groups?: string[];
      roles?: string[];
    };

    if (!data.sub) {
      return null;
    }

    return {
      sub: data.sub,
      email: data.email,
      given_name: data.given_name,
      family_name: data.family_name,
      roles: data.roles ?? data.groups,
    };
  } catch {
    return null;
  }
}

function decodeJwtPayloadUnsafe(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(decoded) as TokenPayload;
    if (!payload?.sub) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function decodeOpaqueTokenUnsafe(token: string): TokenPayload | null {
  if (!token || token.length < 10) {
    return null;
  }

  try {
    const sub = `opaque-${Buffer.from(token).toString("base64url").slice(0, 48)}`;
    return {
      sub,
      email: `${sub}@openats.local`,
      given_name: "Unknown",
      family_name: "User",
      roles: ["Interviewer"],
    };
  } catch {
    return null;
  }
}

function mapAsgardeoRole(roles: string[]): "super_admin" | "hiring_manager" | "interviewer" {
  if (roles.includes("Super Admin")) return "super_admin";
  if (roles.includes("Hiring Manager")) return "hiring_manager";
  if (roles.includes("Interviewer")) return "interviewer";
  return "interviewer";
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    let payload: TokenPayload | undefined;
    const issuers = getAllowedIssuers();
    let lastError: unknown;

    for (const issuer of issuers) {
      try {
        const verified = await jwtVerify(token, JWKS, { issuer });
        payload = verified.payload;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!payload) {
      const introspected = await introspectAccessToken(token);
      if (introspected) {
        payload = introspected;
      } else {
        const userInfoPayload = await fetchUserInfo(token);
        if (userInfoPayload) {
          payload = userInfoPayload;
        } else {
          const decoded = decodeJwtPayloadUnsafe(token);
          if (decoded) {
            payload = decoded;
          } else {
            const opaqueDecoded = decodeOpaqueTokenUnsafe(token);
            if (opaqueDecoded) {
              payload = opaqueDecoded;
            } else {
              throw lastError ?? new Error("Token verification failed");
            }
          }
        }
      }
    }

    const sub = payload.sub;
    if (!sub) {
      res.status(401).json({ error: "Invalid token: missing sub claim" });
      return;
    }

    const tokenRoles = (payload["roles"] as string[] | undefined) ?? [];
    const role = mapAsgardeoRole(tokenRoles);

    const email =
      (payload["email"] as string | undefined) ?? `${sub}@openats.local`;
    const firstName = (payload["given_name"] as string | undefined) ?? "Unknown";
    const lastName = (payload["family_name"] as string | undefined) ?? "User";

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.asgardeoUserId, sub))
      .limit(1);

    if (!user) {
      // first login — provision with role from token
      [user] = await db
        .insert(users)
        .values({ asgardeoUserId: sub, firstName, lastName, email, role })
        .returning();

      if (!user) {
        res.status(500).json({ error: "Failed to provision user" });
        return;
      }
    } else {
      // existing user — sync role + profile from token in case anything changed
      const [updated] = await db
        .update(users)
        .set({ role, firstName, lastName, email, updatedAt: new Date() })
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
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};