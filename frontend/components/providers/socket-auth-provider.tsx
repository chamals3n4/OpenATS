"use client";

import { createContext, useContext } from "react";

/**
 * Carries a short-lived OpenATS JWT from the dashboard layout (a server
 * component, where it is issued) down to the client hooks that open socket
 * connections. The backend rejects sockets without it. This handshake is the
 * only reason the token reaches client components.
 */
const SocketTokenContext = createContext<string | undefined>(undefined);

export function SocketAuthProvider({
  token,
  children,
}: {
  token: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <SocketTokenContext.Provider value={token}>
      {children}
    </SocketTokenContext.Provider>
  );
}

export function useSocketToken(): string | undefined {
  return useContext(SocketTokenContext);
}
