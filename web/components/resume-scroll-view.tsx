"use client";

import { useMemo } from "react";

type ResumeScrollViewProps = {
  resumeUrl: string;
};

/**
 * Uses the browser's native PDF viewer via an iframe.
 */
export function ResumeScrollView({ resumeUrl }: ResumeScrollViewProps) {
  const src = useMemo(() => resumeUrl, [resumeUrl]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <iframe
        src={src}
        title="Resume"
        className="min-h-0 flex-1 w-full border-0 bg-white"
      />
    </div>
  );
}
