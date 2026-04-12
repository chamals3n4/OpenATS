import { NextResponse } from "next/server";
import { getRequiredAccessToken } from "@/lib/asgardeo-access-token";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!id) {
      return NextResponse.json(
        { error: "Candidate ID is required" },
        { status: 400 },
      );
    }

    const token = await getRequiredAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/candidates/${id}/resume`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: "Request failed" }));
      return NextResponse.json(json, { status: res.status });
    }

    const body = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "application/pdf";
    const cd = res.headers.get("content-disposition") ?? "inline";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Content-Disposition": cd,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load resume";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
