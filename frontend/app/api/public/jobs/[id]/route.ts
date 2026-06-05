import { type NextRequest, NextResponse } from "next/server";
import {
  publicApiCorsHeaders,
  publicApiOptionsResponse,
} from "@/lib/public-api-cors";
import { publicJobsUpstreamHeaders } from "@/lib/public-jobs-proxy";

export async function OPTIONS(request: NextRequest) {
  return publicApiOptionsResponse(request);
}

function backendBaseUrl(): string | null {
  const raw =
    process.env.OPENATS_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const trimmed = raw.replace(/\/$/, "");
  return trimmed || null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const base = backendBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "API base URL is not configured (OPENATS_API_URL or NEXT_PUBLIC_API_URL).",
      },
      { status: 500, headers: publicApiCorsHeaders(request) },
    );
  }

  const { id } = await Promise.resolve(context.params);
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid job id" },
      { status: 400, headers: publicApiCorsHeaders(request) },
    );
  }

  const url = new URL(`${base}/public/jobs/${encodeURIComponent(id)}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const upstream = await fetch(url.toString(), {
    headers: publicJobsUpstreamHeaders(request),
    cache: "no-store",
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      ...publicApiCorsHeaders(request),
    },
  });
}
