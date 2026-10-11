"use client";

import { EmailSubjectField } from "./email-subject-field";
import { EmailBodyEditor } from "./email-body-editor";

interface EmailBuilderProps {
  subject: string;
  onSubjectChange: (value: string) => void;
  subjectError?: string | undefined;
  bodyHtml: string;
  onBodyHtmlChange: (value: string) => void;
  readOnly?: boolean;
}

/** Subject and body in one frame, so it reads as the email being written. */
export function EmailBuilder({
  subject,
  onSubjectChange,
  subjectError,
  bodyHtml,
  onBodyHtmlChange,
  readOnly = false,
}: EmailBuilderProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">Email</p>
      <div
        className={`overflow-hidden rounded-xl border bg-white transition-colors focus-within:border-theme dark:bg-neutral-950 ${
          subjectError ? "border-red-500" : "border-slate-300 dark:border-neutral-600"
        }`}
      >
        <EmailSubjectField
          value={subject}
          onChange={onSubjectChange}
          invalid={!!subjectError}
          readOnly={readOnly}
        />
        <EmailBodyEditor value={bodyHtml} onChange={onBodyHtmlChange} readOnly={readOnly} />
      </div>
      {subjectError ? (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {subjectError}
        </p>
      ) : (
        !readOnly && (
          <p className="text-[13px] text-slate-500 dark:text-neutral-400">
            Type <kbd className="rounded border border-slate-300 bg-slate-100 px-1 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-800">/</kbd>{" "}
            in the body for headings, lists, buttons and variables.
          </p>
        )
      )}
    </div>
  );
}
