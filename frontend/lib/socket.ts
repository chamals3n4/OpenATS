"use client";

import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Give up after this many auth failures instead of looping forever.
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

// Opens a socket that re-reads its token on every connect.
export function createAuthedSocket(fallbackToken?: string): Socket {
  let authRetries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: (cb: (data: { token: string | undefined }) => void) => {
      // First attempt reuses the server-rendered token.
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
    // Handshake rejections need a manual restart. socket.io retries the rest.
    if (socket.active) return;
    if (authRetries >= MAX_AUTH_RETRIES) return;

    authRetries += 1;
    retryTimer = setTimeout(() => socket.connect(), AUTH_RETRY_DELAY_MS);
  });

  socket.on("disconnect", (reason) => {
    // A server-side disconnect also skips auto-reconnect.
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
