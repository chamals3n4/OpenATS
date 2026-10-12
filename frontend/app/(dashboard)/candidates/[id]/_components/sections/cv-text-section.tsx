"use client";

import type { CandidateCvText } from "@/types";

/** Why there is no text to show, in words a recruiter can act on. */
function notice(cvText: CandidateCvText | null, hasResume: boolean): string | null {
  if (!hasResume) return "This candidate has no CV.";
  if (!cvText) return "The text of this CV has not been read yet.";
  if (cvText.status === "pending") return "Reading the CV. This usually takes a few seconds.";
  if (cvText.status === "empty") {
    return "No text could be read from this CV. It may be a scan or a photo, so this candidate will not appear in CV search.";
  }
  if (cvText.status === "failed") {
    return "This CV could not be read, so this candidate will not appear in CV search.";
  }
  return null;
}

/** The text read from the candidate's CV on the server: what CV search looks through. */
export function CvTextSection({
  cvText,
  hasResume,
}: {
  cvText: CandidateCvText | null;
  hasResume: boolean;
}) {
  const message = notice(cvText, hasResume);

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          CV text
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Read from the CV file. This is what candidate search looks through.
        </p>
      </div>

      {message ? (
        <p className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          {message}
        </p>
      ) : (
        <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-slate-300 bg-white px-4 py-3 font-sans text-sm leading-6 text-slate-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
          {cvText?.text}
        </pre>
      )}
    </div>
  );
}
