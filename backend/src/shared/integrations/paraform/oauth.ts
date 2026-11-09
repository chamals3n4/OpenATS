import { createHash, randomBytes } from "crypto";
import { decrypt, encrypt } from "../crypto";

/**
 * Sign-in with Paraform. Paraform's MCP server sends callers to this authorization server
 * (`/.well-known/oauth-protected-resource`), which supports dynamic client registration, PKCE
 * and refresh tokens, so an installation needs no client id or secret set up by hand.
 */
export const PARAFORM_AUTH_SERVER = "https://login.paraform.com";
export const PARAFORM_MCP_URL = "https://mcp-paraform.paraform.com/mcp";
const SCOPE = "openid email profile offline_access";
const STATE_TTL_MS = 10 * 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

export class ParaformOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParaformOAuthError";
  }
}

export type ParaformTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  accountEmail: string | null;
};

/** Where Paraform sends the admin back to: this API's own callback route. */
export function paraformRedirectUri(): string {
  const base = (
    process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 8080}`
  )
    .trim()
    .replace(/\/$/, "");
  return `${base}/oauth/paraform/callback`;
}

async function postForm(
  path: string,
  body: Record<string, string>,
): Promise<unknown> {
  const res = await fetch(`${PARAFORM_AUTH_SERVER}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!res.ok || !json) {
    const reason =
      typeof json?.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new ParaformOAuthError(
      `Paraform refused the request to ${path}: ${reason}`,
    );
  }
  return json;
}

/** Registers this installation as a public client (no secret) and returns its client id. */
export async function registerClient(redirectUri: string): Promise<string> {
  const res = await fetch(`${PARAFORM_AUTH_SERVER}/oauth2/register`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: "OpenATS",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPE,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as {
    client_id?: unknown;
  } | null;
  if (!res.ok || typeof json?.client_id !== "string") {
    throw new ParaformOAuthError(
      `Paraform refused to register OpenATS (HTTP ${res.status})`,
    );
  }
  return json.client_id;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: SCOPE,
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    resource: PARAFORM_MCP_URL,
  });
  return `${PARAFORM_AUTH_SERVER}/oauth2/authorize?${params.toString()}`;
}

type PendingSignIn = { userId: number; clientId: string; verifier: string };

/**
 * The state sent through the browser. It carries the PKCE verifier, so it is encrypted (AES-GCM,
 * which also stops it being altered), not just signed: the verifier must never be readable on the
 * way through Paraform.
 */
export function sealState(pending: PendingSignIn, now = Date.now()): string {
  const payload = JSON.stringify({ ...pending, exp: now + STATE_TTL_MS });
  return Buffer.from(encrypt(payload), "utf8").toString("base64url");
}

export function openState(state: string, now = Date.now()): PendingSignIn {
  let body: PendingSignIn & { exp: number };
  try {
    body = JSON.parse(
      decrypt(Buffer.from(state, "base64url").toString("utf8")),
    );
  } catch {
    throw new ParaformOAuthError("The Paraform sign-in link is not valid");
  }
  if (typeof body.exp !== "number" || now > body.exp) {
    throw new ParaformOAuthError("The Paraform sign-in link has expired");
  }
  return {
    userId: body.userId,
    clientId: body.clientId,
    verifier: body.verifier,
  };
}

/** Reads the email from the ID token, only to show who connected. Not used to authorize anything. */
export function emailFromIdToken(idToken: unknown): string | null {
  if (typeof idToken !== "string") return null;
  const part = idToken.split(".")[1];
  if (!part) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8"),
    ) as { email?: unknown };
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}

function toTokens(json: unknown, now: number): ParaformTokens {
  const body = json as Record<string, unknown>;
  if (typeof body.access_token !== "string") {
    throw new ParaformOAuthError("Paraform did not return an access token");
  }
  const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 300;
  return {
    accessToken: body.access_token,
    refreshToken:
      typeof body.refresh_token === "string" ? body.refresh_token : null,
    expiresAt: new Date(now + expiresIn * 1000),
    accountEmail: emailFromIdToken(body.id_token),
  };
}

export async function exchangeCode(input: {
  code: string;
  clientId: string;
  verifier: string;
  redirectUri: string;
}): Promise<ParaformTokens> {
  const json = await postForm("/oauth2/token", {
    grant_type: "authorization_code",
    code: input.code,
    client_id: input.clientId,
    code_verifier: input.verifier,
    redirect_uri: input.redirectUri,
    resource: PARAFORM_MCP_URL,
  });
  return toTokens(json, Date.now());
}

export async function refreshTokens(
  clientId: string,
  refreshToken: string,
): Promise<ParaformTokens> {
  const json = await postForm("/oauth2/token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    resource: PARAFORM_MCP_URL,
  });
  return toTokens(json, Date.now());
}
