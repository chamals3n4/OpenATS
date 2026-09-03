"use client";

type ResumeScrollViewProps = {
  candidateId: number;
};

/** Uses the browser's native PDF viewer, including its own page and zoom controls. */
export function ResumeScrollView({ candidateId }: ResumeScrollViewProps) {
  return (
    <div className="min-h-0 flex-1 bg-slate-100 dark:bg-neutral-900">
      <iframe
        src={`/api/candidates/${candidateId}/resume`}
        title="Candidate CV preview"
        className="size-full border-0"
      />
    </div>
  );
}
