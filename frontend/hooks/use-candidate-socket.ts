"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function useCandidateSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("candidate_applied", (data: { jobId: number }) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", data.jobId] });
      queryClient.invalidateQueries({ queryKey: ["candidates", "all"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
