import { NextResponse } from "next/server";
import { asgardeo } from "@asgardeo/nextjs/server";

export const dynamic = "force-dynamic";

/**
 * Hands the browser a current Asgardeo access token for the Socket.IO
 * handshake. Client hooks call this on every connect attempt, so a token
 * that expired while a tab sat open is replaced on reconnect instead of
 * failing the handshake silently.
 *
 * The token never reaches the client any other way: it is read from the
 * server-side session, and an unauthenticated caller gets nothing.
 */
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
