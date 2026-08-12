import { NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";

export const dynamic = "force-dynamic";

// Gives the browser a current access token for the socket handshake.
export async function GET() {
  try {
    const client = await asgardeo();
    const sessionId = await client.getSessionId();
    if (!sessionId) {
      return NextResponse.json({ token: null }, { status: 401 });
    }

    const token = await client.getAccessToken(sessionId);
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
