import type { NextRequest } from "next/server";

/** Forwards the browser origin so the API can enforce allowed_origins. */
export function publicJobsUpstreamHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const origin = request.headers.get("origin");
  if (origin) headers["X-OpenATS-Browser-Origin"] = origin;
  return headers;
}
