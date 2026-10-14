"use client";

import { useState, useEffect, useRef } from "react";
import type { AttemptData } from "../_lib/assessment-types";

// Resume an attempt, or start full
export function remainingSeconds(attempt: AttemptData): number {
  // Limit is in minutes, clock in seconds
  const limit = (attempt.assessment.timeLimit ?? 0) * 60;
  if (attempt.status !== "started" || !attempt.startedAt) return limit;
  const elapsed = Math.floor(
    (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
  );
  return Math.max(0, limit - elapsed);
}

export function useAssessmentTimer(
  screen: string,
  attempt: AttemptData | null,
  onTimeUp: () => void,
) {
  const [timeLeft, setTimeLeft] = useState(0);

  // Set the timer once per attempt
  const seedKey = attempt ? `${attempt.id}:${attempt.startedAt ?? ""}` : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (attempt && seedKey !== seededKey) {
    setSeededKey(seedKey);
    setTimeLeft(remainingSeconds(attempt));
  }

  // Submit once when time runs out
  const timeUpFired = useRef(false);

  // Countdown
  useEffect(() => {
    if (screen !== "quiz") return;
    if (timeLeft <= 0) {
      if (!timeUpFired.current) {
        timeUpFired.current = true;
        onTimeUp();
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft, onTimeUp]);

  return { timeLeft };
}
