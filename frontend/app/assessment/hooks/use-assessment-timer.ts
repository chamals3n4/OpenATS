"use client";

import { useState, useEffect } from "react";
import type { AttemptData } from "../_lib/assessment-types";

// An in-progress attempt resumes where it left off; anything else starts full.
function remainingSeconds(attempt: AttemptData): number {
  const limit = attempt.assessment.timeLimit ?? 0;
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

  // Seed the timer once per attempt, then let the countdown below own it.
  const [seededAttemptId, setSeededAttemptId] = useState<number | null>(null);
  if (attempt && attempt.id !== seededAttemptId) {
    setSeededAttemptId(attempt.id);
    setTimeLeft(remainingSeconds(attempt));
  }

  // Countdown
  useEffect(() => {
    if (screen !== "quiz") return;
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft, onTimeUp]);

  return { timeLeft };
}
