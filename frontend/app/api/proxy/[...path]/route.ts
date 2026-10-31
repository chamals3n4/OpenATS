import { NextRequest, NextResponse } from "next/server";
import { getApiToken } from "@/lib/auth/session";
import { SESSION_EXPIRED } from "@/lib/client-fetch";
import { pickForwardedHeaders } from "@/lib/server-fetch";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext) {
  // Sign-in is by cookie, so another site must not be able to send these
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { path } = await context.params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const token = await getApiToken();
    if (!token) {
      return NextResponse.json(
        { error: "Your session has ended. Please sign in again.", code: SESSION_EXPIRED },
        { status: 401 },
      );
    }

    const contentType = request.headers.get("content-type");
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const target = `${API_BASE_URL}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

    const response = await fetch(target, {
      method: request.method,
      headers: {
        ...pickForwardedHeaders(request.headers),
        ...(contentType ? { "Content-Type": contentType } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("[api/proxy]", error);
    return NextResponse.json({ error: "Could not reach the server" }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
