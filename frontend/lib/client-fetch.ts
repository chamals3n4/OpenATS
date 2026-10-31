/** Sent with a 401 when the person has no session left, not for any other 401 */
export const SESSION_EXPIRED = "SESSION_EXPIRED";

/**
 * Express API call from the browser, through /api/proxy.
 * Not a server action: Next.js hides the message of an error thrown by one in
 * production, and runs them one at a time.
 */
export async function clientFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;

    // Only here: a 401 with a live session would bounce from /login back to the
    // dashboard and round again. A full load, so no candidate data stays cached
    if (res.status === 401 && error?.code === SESSION_EXPIRED) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }

    throw new Error(error?.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
