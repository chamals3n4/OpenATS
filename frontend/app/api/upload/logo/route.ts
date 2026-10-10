import { NextResponse } from "next/server";
import { getApiToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function POST(req: Request) {
  try {
    const token = await getApiToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await req.formData();

    const res = await fetch(`${API_BASE_URL}/api/upload/logo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const json = await res.json().catch(() => ({ error: "Request failed" }));
    return NextResponse.json(json, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
