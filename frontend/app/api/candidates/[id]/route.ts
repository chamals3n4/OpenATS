import { serverApiUrl } from "@/lib/api-url";
import { NextResponse } from "next/server";
import { getApiToken } from "@/lib/auth/session";


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

    const token = await getApiToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await req.formData();

    const res = await fetch(`${serverApiUrl()}/api/candidates/${id}`, {
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
