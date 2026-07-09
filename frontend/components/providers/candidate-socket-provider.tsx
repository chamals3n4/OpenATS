"use client";

import { useCandidateSocket } from "@/hooks/use-candidate-socket";

/** Single dashboard-wide socket connection for realtime cache invalidation — don't also mount useCandidateSocket() in pages. */
export function CandidateSocketProvider() {
  useCandidateSocket();
  return null;
}
