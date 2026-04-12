export type AttemptStatus = "pending" | "started" | "completed" | "expired";

/**
 * Objective questions are correct only when the selected option IDs
 * exactly match the correct option IDs (order-insensitive).
 */
export function isObjectiveAnswerCorrect(
  correctOptionIds: number[],
  selectedOptionIds: number[],
): boolean {
  const a = [...correctOptionIds].sort((x, y) => x - y);
  const b = [...selectedOptionIds].sort((x, y) => x - y);
  return JSON.stringify(a) === JSON.stringify(b);
}

export function clampScore(score: number, maxPoints: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxPoints) || maxPoints <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(maxPoints, score));
}

export function canTransitionAttemptStatus(
  from: AttemptStatus,
  to: AttemptStatus,
): boolean {
  if (from === to) return true;
  if (from === "pending" && (to === "started" || to === "expired"))
    return true;
  if (from === "started" && (to === "completed" || to === "expired"))
    return true;
  return false;
}

