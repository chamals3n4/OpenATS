"use client";

import { Label } from "@/components/ui/label";
import { LABEL_CLASS } from "../../../lib/template-form-constants";
import { renderPreview } from "../../../lib/template-form-utils";
import { VARS } from "../../../lib/template-form-constants";
import type { Block } from "../../../lib/template-form-types";

interface EmailPreviewProps {
  blocks: Block[];
}

export function EmailPreview({ blocks }: EmailPreviewProps) {
  return (
    <div className="space-y-2 pt-2">
      <Label className={LABEL_CLASS}>Preview</Label>
      <div className="rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-6">
        <div className="space-y-4">
          {blocks.map((block) => {
            switch (block.kind) {
              case "heading":
                return (
                  <h2
                    key={block.id}
                    className="text-slate-900 dark:text-neutral-100"
                    style={{ fontSize: 22, fontWeight: 700, margin: 0 }}
                    dangerouslySetInnerHTML={{
                      __html: renderPreview(block.content, VARS),
                    }}
                  />
                );
              case "text":
                return (
                  <p
                    key={block.id}
                    className="text-slate-600 dark:text-neutral-300"
                    style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}
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
                  <div
                    key={block.id}
                    style={{ textAlign: "center", margin: "8px 0" }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        background: "var(--theme-color)",
                        color: "#fff",
                        padding: "10px 28px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 14,
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
    </div>
  );
}
