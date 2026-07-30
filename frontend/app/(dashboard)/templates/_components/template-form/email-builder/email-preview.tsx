"use client";

import { renderPreviewHtml } from "../../../lib/template-form-utils";
import { VARS, SAMPLE } from "../../../lib/template-form-constants";

interface EmailPreviewPanelProps {
  subject: string;
  bodyHtml: string;
}

function renderSubject(subject: string): string {
  let out = subject;
  VARS.forEach((key) => {
    out = out.replaceAll(`{{${key}}}`, SAMPLE[key] ?? key);
  });
  return out;
}

export function EmailPreviewPanel({ subject, bodyHtml }: EmailPreviewPanelProps) {
  const isEmpty = !bodyHtml || bodyHtml === "<p></p>";

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-8 pt-7 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            Live Preview
          </span>
          <span className="size-1.5 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {isEmpty && !subject ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm text-slate-400 dark:text-neutral-500">
              Start writing on the left to preview the email
            </p>
          </div>
        ) : (
          <div>
            {subject && (
              <>
                <p className="text-sm font-semibold text-slate-800 dark:text-neutral-100 leading-snug mb-4">
                  {renderSubject(subject)}
                </p>
                <div className="border-t border-slate-200 dark:border-neutral-700 mb-4" />
              </>
            )}
            <div
              className="text-sm text-slate-700 dark:text-neutral-300 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-neutral-100 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-neutral-100 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-neutral-100 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_a]:text-[var(--theme-color)] [&_a]:underline [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-neutral-700"
              dangerouslySetInnerHTML={{ __html: renderPreviewHtml(bodyHtml) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
