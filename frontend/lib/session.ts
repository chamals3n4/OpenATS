import { cache } from "react";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "./auth";

export type AppRole = "super_admin" | "hiring_manager" | "interviewer";

/**
 * Server-side session helpers. Each is wrapped in `cache()` so that several
 * calls within one server render share a single lookup.
 */

/** The current Better Auth session, or null when nobody is signed in. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * A short-lived JWT for the Express API, or null when nobody is signed in.
 * Express verifies it against `/api/auth/jwks`.
 */
export const getApiToken = cache(async (): Promise<string | null> => {
  try {
    const { token } = await auth.api.getToken({ headers: await headers() });
    return token;
  } catch (error) {
    // No session is an expected outcome; anything else is a real failure.
    if (error instanceof APIError && error.statusCode === 401) return null;
    throw error;
  }
});

/**
 * Throws "Unauthorized" without a session and "Forbidden" when the signed-in
 * user's role is not exactly `role`.
 */
export const requireRole = cache(async (role: AppRole): Promise<void> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== role) throw new Error("Forbidden");
});
