"use client";

import { renderPreview } from "../../../lib/template-form-utils";
import { VARS } from "../../../lib/template-form-constants";
import type { Block } from "../../../lib/template-form-types";

interface EmailPreviewPanelProps {
  subject: string;
  blocks: Block[];
}

export function EmailPreviewPanel({ subject, blocks }: EmailPreviewPanelProps) {
  const isEmpty = blocks.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-8 pt-7 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
            Live Preview
          </span>
          <span className="size-1.5 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto px-8 pb-10">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm text-slate-400 dark:text-neutral-500">
              Add blocks on the left to preview the email
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Subject */}
            {subject && (
              <div className="mb-6">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-neutral-500 block mb-1">
                  Subject
                </span>
                <p
                  className="text-[15px] font-semibold text-slate-800 dark:text-neutral-100 leading-snug"
                  dangerouslySetInnerHTML={{
                    __html: renderPreview(subject, VARS),
                  }}
                />
              </div>
            )}

            {/* Divider */}
            {subject && (
              <div className="border-t border-slate-200 dark:border-neutral-700 mb-6" />
            )}

            {/* Blocks */}
            <div className="space-y-5">
              {blocks.map((block) => {
                switch (block.kind) {
                  case "heading":
                    return (
                      <h2
                        key={block.id}
                        className="text-[20px] font-bold text-slate-900 dark:text-neutral-100 leading-snug m-0"
                        dangerouslySetInnerHTML={{
                          __html: renderPreview(block.content, VARS),
                        }}
                      />
                    );
                  case "text":
                    return (
                      <p
                        key={block.id}
                        className="text-[14px] text-slate-600 dark:text-neutral-300 leading-relaxed m-0 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: renderPreview(block.content, VARS).replace(
                            /\n/g,
                            "<br/>",
                          ),
                        }}
                      />
                    );
                  case "button":
                    return (
                      <div key={block.id}>
                        <span
                          style={{
                            display: "inline-block",
                            background: "var(--theme-color)",
                            color: "#fff",
                            padding: "9px 22px",
                            fontWeight: 600,
                            fontSize: 13,
                            borderRadius: 6,
                          }}
                        >
                          {block.content}
                        </span>
                      </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
