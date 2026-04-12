"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";

import type { TemplateEditorBlock } from "@/components/template-block-preview";

type CaretCtx =
  | { area: "subject"; start: number; end: number }
  | { area: "block"; blockId: string; start: number; end: number };

function blockSelector(blockId: string) {
  const safe =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(blockId)
      : blockId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `textarea[data-template-block-id="${safe}"]`;
}

export function useTemplateVariableInsert({
  subject,
  setSubject,
  blocks,
  updateBlock,
}: {
  subject: string;
  setSubject: (s: string) => void;
  blocks: TemplateEditorBlock[];
  updateBlock: (id: string, c: string) => void;
}) {
  const caretRef = useRef<CaretCtx | null>(null);
  const subjectElRef = useRef<HTMLInputElement | null>(null);

  const captureSubjectCaret = useCallback((el: HTMLInputElement) => {
    subjectElRef.current = el;
    caretRef.current = {
      area: "subject",
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    };
  }, []);

  const captureBlockCaret = useCallback(
    (_blockId: string, el: HTMLTextAreaElement) => {
      caretRef.current = {
        area: "block",
        blockId: _blockId,
        start: el.selectionStart,
        end: el.selectionEnd,
      };
    },
    [],
  );

  const insertVariable = useCallback(
    (varName: string) => {
      const ctx = caretRef.current;
      if (!ctx) {
        toast.message(
          "Click in the email subject or a heading, text, or button block and place the cursor first.",
        );
        return;
      }

      const tag = `{{${varName}}}`;

      if (ctx.area === "subject") {
        const el = subjectElRef.current;
        const start = ctx.start;
        const end = ctx.end;
        const next = subject.slice(0, start) + tag + subject.slice(end);
        setSubject(next);
        const np = start + tag.length;
        queueMicrotask(() => {
          if (el && document.body.contains(el)) {
            el.focus();
            el.setSelectionRange(np, np);
          }
          caretRef.current = { area: "subject", start: np, end: np };
        });
        return;
      }

      const b = blocks.find((x) => x.id === ctx.blockId);
      if (!b || !["heading", "text", "button"].includes(b.kind)) {
        toast.error("Variables can only go in heading, text, or button blocks.");
        return;
      }

      const { start, end, blockId } = ctx;
      const next = b.content.slice(0, start) + tag + b.content.slice(end);
      updateBlock(blockId, next);
      const np = start + tag.length;
      queueMicrotask(() => {
        const ta = document.querySelector(
          blockSelector(blockId),
        ) as HTMLTextAreaElement | null;
        if (ta && document.body.contains(ta)) {
          ta.focus();
          ta.setSelectionRange(np, np);
        }
        caretRef.current = {
          area: "block",
          blockId,
          start: np,
          end: np,
        };
      });
    },
    [blocks, subject, setSubject, updateBlock],
  );

  return { captureSubjectCaret, captureBlockCaret, insertVariable };
}
