import { createHash } from "crypto";

/**
 * The public pages a candidate opens from an email. The token in the address is the only thing
 * that lets them in, so anyone who reads it can take the test, hand in the work or answer the offer.
 */
// Case-insensitive, because Express matches routes regardless of case (/public/OFFERS/... works).
const TOKEN_PATH = /^(\/public\/(?:assessment|assignment|offers|interview)\/)[^/?#]+/i;

/**
 * Query values that are secrets: an OAuth sign-in callback (`/oauth/google/callback`) carries a
 * one-time `code` that is swapped for access to the user's account, and the `state` that guards it.
 */
const SECRET_QUERY = /([?&](?:code|state)=)[^&#]*/g;

/**
 * A request's address as it may be written to the log. Logs are read by more people and kept
 * longer than the database, so a candidate's link token and OAuth secrets are replaced with `[redacted]`.
 */
export function logUrl(url: string): string {
  return url.replace(TOKEN_PATH, "$1[redacted]").replace(SECRET_QUERY, "$1[redacted]");
}

/** A short, one-way name for a token, so log lines about the same link can be matched without the token. */
export function tokenFingerprint(token: unknown): string {
  if (typeof token !== "string" || !token) return "none";
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}
