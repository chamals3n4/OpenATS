import { asgardeo } from "@asgardeo/nextjs/server";

/**
 * Returns a non-empty access token for the current Asgardeo session.
 * `getAccessToken` can be empty when the session exists but the token is missing or expired
 * without a refresh — without this check the API receives `Bearer undefined` and responds
 * with the generic "Invalid or expired token".
 */
export async function getRequiredAccessToken(): Promise<string> {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) {
    throw new Error("Not authenticated");
  }
  const token = await client.getAccessToken(sessionId);
  if (typeof token !== "string" || !token.trim()) {
    throw new Error(
      "No access token — your session may have expired. Please sign in again.",
    );
  }
  return token.trim();
}
