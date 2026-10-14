"use client";

import { useState, useEffect, useRef } from "react";
import type { AttemptData } from "../_lib/assessment-types";

// An in-progress attempt resumes where it left off; anything else starts full.
export function remainingSeconds(attempt: AttemptData): number {
  // The limit is saved in minutes; the clock counts seconds.
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

  // Seed the timer once per attempt and start time, then let the countdown below own it.
  // The start time is part of the key because it only arrives when the candidate presses Start.
  const seedKey = attempt ? `${attempt.id}:${attempt.startedAt ?? ""}` : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (attempt && seedKey !== seededKey) {
    setSeededKey(seedKey);
    setTimeLeft(remainingSeconds(attempt));
  }

  // Time running out submits once. If that fails, the candidate retries with the Submit
  // button; calling it again on every render would send request after request.
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
