import { createHash } from "crypto";

/**
 * Query parameters whose values must never reach a log. A sign-in callback carries a one-time code
 * and its state (which, for Paraform, holds the encrypted PKCE verifier) in the query string.
 */
const SECRET_PARAMS = new Set([
  "code",
  "state",
  "token",
  "access_token",
  "refresh_token",
  "id_token",
  "code_verifier",
]);

/**
 * Private links sent to candidates carry their token in the path (`/public/offers/<token>` and the
 * others in routes/public.routes.ts). Whoever holds the token can act as the candidate, so the
 * segment after these prefixes is never logged.
 */
const TOKEN_PATH = /^(\/public\/(?:assessment|assignment|offers|interview)\/)[^/?#]+/;

/**
 * A short, one-way label for a candidate token, so a log line can still be matched to other lines
 * about the same link without holding the token itself.
 */
export function tokenFingerprint(token: string | string[] | undefined): string {
  const value = Array.isArray(token) ? token.join("/") : token;
  if (!value) return "none";
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

/**
 * The request URL as it may be logged: a candidate link's token and each secret query value are
 * replaced; everything else is kept.
 */
export function redactUrl(rawUrl: string): string {
  const url = rawUrl.replace(TOKEN_PATH, "$1[redacted]");
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return url;

  const params = new URLSearchParams(url.slice(queryStart + 1));
  let changed = false;
  for (const key of new Set(params.keys())) {
    if (SECRET_PARAMS.has(key.toLowerCase())) {
      params.set(key, "[redacted]");
      changed = true;
    }
  }
  return changed ? `${url.slice(0, queryStart)}?${params.toString()}` : url;
}
