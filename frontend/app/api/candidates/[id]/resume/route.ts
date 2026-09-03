import { NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getAccessToken() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Unauthorized");
  return client.getAccessToken(sessionId);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(context.params);
    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    const token = await getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/candidates/${id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "Unable to load resume" },
        { status: response.status },
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
