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
      // Only invalidate list-type queries (3-part keys). Individual detail
      // queries ["candidates", id] share the same prefix and must not be touched.
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as unknown[];
          if (key[0] !== "candidates" || key.length < 3) return false;
          return key[1] === data.jobId || key[1] === "all";
        },
      });
    });

    socket.on(
      "cv_analysis_updated",
      (data: { candidateId: number; jobId: number; status: string }) => {
        queryClient.invalidateQueries({
          queryKey: ["candidates", data.candidateId],
        });

        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as unknown[];
            if (key[0] !== "candidates" || key.length < 3) return false;
            return key[1] === data.jobId || key[1] === "all";
          },
        });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
