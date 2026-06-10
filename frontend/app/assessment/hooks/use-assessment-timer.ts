"use client";

import { useState, useEffect, useCallback } from "react";
import type { AttemptData } from "../_lib/assessment-types";

export function useAssessmentTimer(
  screen: string,
  attempt: AttemptData | null,
  onTimeUp: () => void,
) {
  const [timeLeft, setTimeLeft] = useState(0);

  // Initialize timer based on attempt status
  useEffect(() => {
    if (!attempt) return;

    if (attempt.status === "started" && attempt.startedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
      );
      const remaining = Math.max(
        0,
        (attempt.assessment.timeLimit ?? 0) - elapsed,
      );
      setTimeLeft(remaining);
    } else {
      setTimeLeft(attempt.assessment.timeLimit ?? 0);
    }
  }, [attempt]);

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
