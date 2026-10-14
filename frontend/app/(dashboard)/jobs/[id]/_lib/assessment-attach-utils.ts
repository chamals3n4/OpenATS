import type { Assessment, JobAssessment } from "@/types";

/** e.g. "30 min · 5 questions" */
export function describeAssessment(
  assessment: Pick<Assessment, "timeLimit" | "questionCount"> | undefined,
): string {
  if (!assessment) return "";
  const parts: string[] = [];
  if (assessment.timeLimit > 0) parts.push(`${assessment.timeLimit} min`);
  if (assessment.questionCount !== undefined) {
    parts.push(
      `${assessment.questionCount} ${assessment.questionCount === 1 ? "question" : "questions"}`,
    );
  }
  return parts.join(" · ");
}

/** Avoid adding the same assessment twice to a stage */
export function isAlreadyAttached(
  attached: Pick<JobAssessment, "assessmentId" | "triggerStageId">[],
  assessmentId: number,
  stageId: number,
): boolean {
  return attached.some(
    (a) => a.assessmentId === assessmentId && a.triggerStageId === stageId,
  );
}

/** Sort by pipeline order */
export function sortByStageOrder<T extends Pick<JobAssessment, "triggerStageId">>(
  attachments: T[],
  stages: { id: number; position: number }[],
): T[] {
  const rank = new Map(stages.map((s) => [s.id, s.position]));
  const of = (a: T) =>
    a.triggerStageId === null
      ? Number.MAX_SAFE_INTEGER
      : (rank.get(a.triggerStageId) ?? Number.MAX_SAFE_INTEGER - 1);
  return [...attachments].sort((a, b) => of(a) - of(b));
}
