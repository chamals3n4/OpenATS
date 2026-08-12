"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Give up after this many consecutive auth failures rather than loop forever. */
const MAX_AUTH_RETRIES = 3;
const AUTH_RETRY_DELAY_MS = 1_000;

async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/socket-token", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string | null };
    return data.token;
  } catch {
    return null;
  }
}

/**
 * Opens an authenticated socket that re-reads its token on every connection
 * attempt.
 *
 * The token used to be captured once when the dashboard layout rendered, so
 * once it expired the socket could never reconnect and realtime stayed dead
 * until a full page refresh. `auth` as a callback runs again on each retry,
 * and because the server rejects a bad token in handshake middleware — which
 * stops socket.io's automatic reconnection — we restart it ourselves with a
 * bounded number of attempts.
 *
 * `fallbackToken` is the server-rendered token: it saves a round trip on the
 * very first connect.
 */
export function createAuthedSocket(fallbackToken?: string): Socket {
  let authRetries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: (cb: (data: { token: string | undefined }) => void) => {
      // First attempt can use the token the server already rendered with.
      if (authRetries === 0 && fallbackToken) {
        cb({ token: fallbackToken });
        return;
      }
      void fetchSocketToken().then((token) =>
        cb({ token: token ?? fallbackToken }),
      );
    },
  });

  socket.on("connect", () => {
    authRetries = 0;
  });

  socket.on("connect_error", () => {
    // A handshake rejection leaves the socket inactive; only those need a
    // manual restart. Transport blips are retried by socket.io itself.
    if (socket.active) return;
    if (authRetries >= MAX_AUTH_RETRIES) return;

    authRetries += 1;
    retryTimer = setTimeout(() => socket.connect(), AUTH_RETRY_DELAY_MS);
  });

  socket.on("disconnect", (reason) => {
    // The server dropping us (e.g. restart) also skips auto-reconnect.
    if (reason === "io server disconnect" && authRetries < MAX_AUTH_RETRIES) {
      authRetries += 1;
      retryTimer = setTimeout(() => socket.connect(), AUTH_RETRY_DELAY_MS);
    }
  });

  const originalDisconnect = socket.disconnect.bind(socket);
  socket.disconnect = () => {
    if (retryTimer) clearTimeout(retryTimer);
    return originalDisconnect();
  };

  return socket;
}
