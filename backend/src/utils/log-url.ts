import { createHash } from "crypto";

/**
 * The public pages a candidate opens from an email. The token in the address is the only thing
 * that lets them in, so anyone who reads it can take the test, hand in the work or answer the offer.
 */
const TOKEN_PATH = /^(\/public\/(?:assessment|assignment|offers|interview)\/)[^/?#]+/;

/**
 * A request's address as it may be written to the log. Logs are read by more people and kept
 * longer than the database, so a candidate's link token is replaced with `[redacted]`.
 */
export function logUrl(url: string): string {
  return url.replace(TOKEN_PATH, "$1[redacted]");
}

/** A short, one-way name for a token, so log lines about the same link can be matched without the token. */
export function tokenFingerprint(token: unknown): string {
  if (typeof token !== "string" || !token) return "none";
  return createHash("sha256").update(token).digest("hex").slice(0, 8);
}
