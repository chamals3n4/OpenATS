import { NextResponse } from "next/server";
import { getApiToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Token for the socket handshake
export async function GET() {
  try {
    const token = await getApiToken();
    if (!token) {
      return NextResponse.json({ token: null }, { status: 401 });
    }

    return NextResponse.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ token: null }, { status: 401 });
  }
}
