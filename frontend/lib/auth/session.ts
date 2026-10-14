import { cache } from "react";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "./server";

export type AppRole = "super_admin" | "hiring_manager" | "interviewer";

/** Server session helpers, cached per render */

/** Current session, or null */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Short lived JWT for the Express API, or null */
export const getApiToken = cache(async (): Promise<string | null> => {
  try {
    const { token } = await auth.api.getToken({ headers: await headers() });
    return token;
  } catch (error) {
    // No session is fine, other errors are not
    if (error instanceof APIError && error.statusCode === 401) return null;
    throw error;
  }
});

/** Throw if not signed in or the role doesn't match */
export const requireRole = cache(async (role: AppRole): Promise<void> => {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== role) throw new Error("Forbidden");
});
