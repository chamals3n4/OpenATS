import { NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getAccessToken() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) throw new Error("Unauthorized");
  return client.getAccessToken(sessionId);
}

export async function PATCH(
  req: Request,
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

    const token = await getAccessToken();
    const formData = await req.formData();

    const res = await fetch(`${API_BASE_URL}/api/candidates/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const json = await res.json().catch(() => ({ error: "Request failed" }));
    return NextResponse.json(json, { status: res.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update candidate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
