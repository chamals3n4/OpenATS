"use server";

import { cache } from "react";
import { headers } from "next/headers";
import { apiFetch } from "./api";
import { getApiToken } from "./session";

/**
 * Cached auth context — deduplicates the async token / headers
 * calls so that multiple `serverFetch` calls within the same server-render
 * (RSC request or server-action) share a single token lookup.
 */
const getAuthContext = cache(async () => {
  const token = await getApiToken();
  if (!token) throw new Error("Not authenticated");

  const incomingHeaders = await headers();
  const forwardedHeaders: Record<string, string> = {};

  const copyHeader = (name: string) => {
    const value = incomingHeaders.get(name);
    if (value) forwardedHeaders[name] = value;
  };

  copyHeader("user-agent");
  copyHeader("x-forwarded-for");
  copyHeader("x-real-ip");
  copyHeader("cf-connecting-ip");
  copyHeader("x-forwarded-proto");
  copyHeader("x-forwarded-host");

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
