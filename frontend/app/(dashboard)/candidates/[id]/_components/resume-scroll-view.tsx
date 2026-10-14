"use client";

type ResumeScrollViewProps = {
  candidateId: number;
};

export function ResumeScrollView({ candidateId }: ResumeScrollViewProps) {
  return (
    <div className="min-h-0 flex-1 bg-slate-100 dark:bg-neutral-900">
      <iframe
        // Open at 100% zoom
        src={`/api/candidates/${candidateId}/resume#zoom=100`}
        title="Candidate CV preview"
        className="size-full border-0"
      />
    </div>
  );
}
