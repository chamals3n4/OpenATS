import { asgardeo } from "@asgardeo/nextjs/server";

type AppRole = "super_admin" | "hiring_manager" | "interviewer";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

function collectRoles(payload: Record<string, unknown>): string[] {
  const out: string[] = [];

  const roles = payload["roles"];
  if (Array.isArray(roles)) {
    for (const x of roles) if (typeof x === "string" && x.trim()) out.push(x.trim());
  } else if (typeof roles === "string" && roles.trim()) {
    out.push(roles.trim());
  }

  const wso2 = payload["http://wso2.org/claims/role"];
  if (Array.isArray(wso2)) {
    for (const x of wso2) if (typeof x === "string" && x.trim()) out.push(x.trim());
  } else if (typeof wso2 === "string" && wso2.trim()) {
    for (const part of wso2.split(",")) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }

  return out;
}

function mapToAppRole(names: string[]): AppRole | null {
  const n = names.map((s) => s.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " "));
  const has = (f: (x: string) => boolean) => n.some(f);

  if (has((x) => x === "super admin" || x.endsWith("/super admin") || x.includes("super admin")))
    return "super_admin";
  if (has((x) => x === "hiring manager" || x.endsWith("/hiring manager")))
    return "hiring_manager";
  if (has((x) => x === "interviewer" || x.endsWith("/interviewer")))
    return "interviewer";

  return null;
}

export async function requireRole(required: AppRole): Promise<void> {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Unauthorized");

  const token = await client.getAccessToken(sessionId);
  const payload = decodeJwtPayload(token);
  const role = mapToAppRole(collectRoles(payload));

  if (role !== required) throw new Error("Forbidden");
}
