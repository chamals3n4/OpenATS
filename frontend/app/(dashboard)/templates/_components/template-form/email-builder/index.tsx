"use client";

import { EmailSubjectField } from "./email-subject-field";
import { EmailBodyEditor } from "./email-body-editor";

interface EmailBuilderProps {
  subject: string;
  onSubjectChange: (value: string) => void;
  bodyHtml: string;
  onBodyHtmlChange: (value: string) => void;
  readOnly?: boolean;
}

export function EmailBuilder({
  subject,
  onSubjectChange,
  bodyHtml,
  onBodyHtmlChange,
  readOnly = false,
}: EmailBuilderProps) {
  return (
    <>
      <EmailSubjectField value={subject} onChange={onSubjectChange} readOnly={readOnly} />
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
          Email Body
        </span>
        <EmailBodyEditor value={bodyHtml} onChange={onBodyHtmlChange} readOnly={readOnly} />
      </div>
    </>
  );
}
