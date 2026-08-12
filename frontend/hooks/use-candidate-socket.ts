"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocketToken } from "@/components/providers/socket-auth-provider";
import { createAuthedSocket } from "@/lib/socket";

export function useCandidateSocket() {
  const queryClient = useQueryClient();
  const token = useSocketToken();

  useEffect(() => {
    if (!token) return;

    const socket = createAuthedSocket(token);

    socket.on("candidate_applied", (data: { jobId: number }) => {
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

    socket.on(
      "candidate_stage_changed",
      (data: { candidateId: number; jobId: number; stageId: number }) => {
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

    socket.on(
      "offer_changed",
      (data: { offerId: number; candidateId: number; jobId: number }) => {
        queryClient.invalidateQueries({ queryKey: ["offers"] });
        queryClient.invalidateQueries({
          queryKey: ["candidates", data.candidateId],
        });
      },
    );

    socket.on(
      "interview_changed",
      (data: { interviewId: number; candidateId: number }) => {
        queryClient.invalidateQueries({ queryKey: ["interviews"] });
        queryClient.invalidateQueries({
          queryKey: ["interview-feedback", data.interviewId],
        });
        queryClient.invalidateQueries({
          queryKey: ["candidates", data.candidateId],
        });
      },
    );

    socket.on(
      "assessment_progress_updated",
      (data: { candidateId: number; attemptId: number }) => {
        queryClient.invalidateQueries({
          queryKey: ["candidate-assessments", data.candidateId],
        });
        queryClient.invalidateQueries({
          queryKey: ["attempt-results", data.attemptId],
        });
        queryClient.invalidateQueries({
          queryKey: ["candidates", data.candidateId],
        });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [queryClient, token]);
}
