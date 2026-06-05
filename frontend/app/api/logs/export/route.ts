import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/auth-action";
import type { ActiveLogExportPayload } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const path = query ? `/logs/export?${query}` : "/logs/export";

    const res = await serverFetch<{ data: ActiveLogExportPayload }>(path);
    return NextResponse.json(res.data, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to export active logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
