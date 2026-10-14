"use client";

import { createContext, useContext } from "react";

/** Passes the socket token to client hooks */
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
