"use server";

import { asgardeo } from "@asgardeo/nextjs/server";
import { headers } from "next/headers";
import { apiFetch } from "./api";

export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Not authenticated");
  const token = await client.getAccessToken(sessionId);

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

  return apiFetch<T>(path, token, {
    ...options,
    headers: {
      ...forwardedHeaders,
      ...(options?.headers ?? {}),
    },
  });
}
