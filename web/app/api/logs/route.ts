import { NextResponse } from "next/server";
import { serverFetch } from "@/lib/auth-action";
import type { ActiveLog } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.toString();
    const path = query ? `/logs?${query}` : "/logs";

    const res = await serverFetch<{ data: ActiveLog[] }>(path);
    return NextResponse.json(res.data, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch active logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
