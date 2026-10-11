"use client";

import { useCandidateSocket } from "@/hooks/use-candidate-socket";

export function CandidateSocketProvider() {
  useCandidateSocket();
  return null;
}
