"use client";

import { fillSampleText, renderPreviewHtml } from "../../../lib/template-form-utils";
import { SAMPLE } from "../../../lib/template-form-constants";
import { PreviewPane } from "../preview-pane";

interface EmailPreviewPanelProps {
  subject: string;
  bodyHtml: string;
}

export function EmailPreviewPanel({ subject, bodyHtml }: EmailPreviewPanelProps) {
  const hasBody = !!bodyHtml && bodyHtml !== "<p></p>";

  return (
    <PreviewPane note="Highlighted values are sample data. Each candidate gets their own.">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-neutral-800">
        <p
          className={`text-base font-semibold leading-snug ${
            subject ? "text-slate-900 dark:text-neutral-100" : "text-slate-400 dark:text-neutral-500"
          }`}
        >
          {subject ? fillSampleText(subject) : "No subject yet"}
        </p>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-neutral-400">To: {SAMPLE.candidate_name}</p>
      </div>

      <div className="px-6 py-5">
        {hasBody ? (
          <div
            className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-neutral-100 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-neutral-100 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-neutral-100 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_a]:text-[var(--theme-color)] [&_a]:underline [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-neutral-700"
            dangerouslySetInnerHTML={{ __html: renderPreviewHtml(bodyHtml) }}
          />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-neutral-400">
            The email body appears here as you write.
          </p>
        )}
      </div>
    </PreviewPane>
  );
}
