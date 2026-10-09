/**
 * Pure grading rules for an assessment attempt.
 *
 * Choice questions are graded automatically. When several options are correct (a "multiple
 * select"), the usual partial-credit rule applies: each correct option picked earns
 * 1/(number correct), each wrong one picked takes the same amount away, and the result never
 * drops below zero. With a single correct option that is plain all-or-nothing.
 *
 * Written questions (short and long answer) are graded by a person.
 */

export const WRITTEN_TYPES = ["short_answer", "long_answer"] as const;

export const isWrittenType = (questionType: string) =>
  (WRITTEN_TYPES as readonly string[]).includes(questionType);

const round2 = (n: number) => Math.round(n * 100) / 100;

export function gradeChoiceQuestion(
  points: number,
  correctOptionIds: number[],
  selectedOptionIds: number[],
): number {
  if (correctOptionIds.length === 0) return 0;
  const correct = new Set(correctOptionIds);
  const selected = new Set(selectedOptionIds);
  let right = 0;
  let wrong = 0;
  for (const id of selected) {
    if (correct.has(id)) right += 1;
    else wrong += 1;
  }
  const fraction = Math.max(0, (right - wrong) / correct.size);
  return round2(points * fraction);
}

/** The percentage score, or 0 when the assessment has no points at all. */
export function scorePercentage(earned: number, possible: number): number {
  return possible > 0 ? round2((earned / possible) * 100) : 0;
}

export const hasPassed = (percentage: number, passMark: number) => percentage >= passMark;
