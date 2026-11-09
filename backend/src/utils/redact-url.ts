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

/** The request URL as it may be logged: the path as is, and each secret query value replaced. */
export function redactUrl(url: string): string {
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
