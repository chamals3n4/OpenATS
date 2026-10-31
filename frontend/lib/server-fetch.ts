import { cache } from "react";
import { headers } from "next/headers";
import { apiFetch } from "./api";
import { getApiToken } from "./auth/session";

/** What the Express API needs to see about the visitor */
export function pickForwardedHeaders(incoming: Headers) {
  const forwarded: Record<string, string> = {};

  for (const name of [
    "user-agent",
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-forwarded-proto",
    "x-forwarded-host",
  ]) {
    const value = incoming.get(name);
    if (value) forwarded[name] = value;
  }

  return forwarded;
}

/** Cache the token per request */
const getAuthContext = cache(async () => {
  const token = await getApiToken();
  if (!token) throw new Error("Not authenticated");

  const forwardedHeaders = pickForwardedHeaders(await headers());

  return { token, forwardedHeaders };
});

export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const { token, forwardedHeaders } = await getAuthContext();

  return apiFetch<T>(path, token, {
    ...options,
    headers: {
      ...forwardedHeaders,
      ...(options?.headers ?? {}),
    },
  });
}
