"use client";

import { useCandidateSocket } from "@/hooks/use-candidate-socket";

// Keeps candidate data fresh from socket events. Renders nothing
export function CandidateSocketListener() {
  useCandidateSocket();
  return null;
}
