import type { NextRequest } from "next/server";

/** Forward the origin for allowed_origins */
export function publicJobsUpstreamHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const origin = request.headers.get("origin");
  if (origin) headers["X-OpenATS-Browser-Origin"] = origin;
  return headers;
}
