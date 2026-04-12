"use client";

import { useRef } from "react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Label } from "@/components/ui/label";

import type { TemplateEditorBlock } from "@/components/template-block-preview";

type BlockEditorProps = {
  block: TemplateEditorBlock;
  onChange(id: string, c: string): void;
  onDelete(id: string): void;
  vars: string[];
  /** Fired when the user moves the caret in a text block (for top “Variables” bar). */
  onTextCaret?: (blockId: string, el: HTMLTextAreaElement) => void;
  darkMode?: boolean;
};

export function TemplateBlockEditor({
  block,
  onChange,
  onDelete,
  vars,
  onTextCaret,
  darkMode = true,
}: BlockEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const reportCaret = (el: HTMLTextAreaElement) => {
    onTextCaret?.(block.id, el);
  };

  const insertVarAtCursor = (v: string) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const tag = `{{${v}}}`;
    const next = block.content.slice(0, start) + tag + block.content.slice(end);
    onChange(block.id, next);
    const np = start + tag.length;
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(np, np);
      reportCaret(el);
    });
  };

  if (["divider", "spacer", "image"].includes(block.kind)) {
    return (
      <div
        className={
          darkMode
            ? "flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 group"
            : "flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 group"
        }
      >
        <span
          className={
            darkMode
              ? "text-[13px] text-slate-500 dark:text-neutral-400 capitalize font-medium"
              : "text-[13px] text-slate-500 capitalize font-medium"
          }
        >
          {block.kind}
        </span>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </button>
      </div>
    );
  }

  const borderCard = darkMode
    ? "border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 group overflow-hidden"
    : "border border-slate-200 rounded-xl bg-white group overflow-hidden";

  const headerRow = darkMode
    ? "flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/60"
    : "flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60";

  const headerLabel = darkMode
    ? "text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide"
    : "text-[12px] font-semibold text-slate-400 uppercase tracking-wide";

  const taClass = darkMode
    ? "w-full px-4 py-3 text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed resize-none bg-white dark:bg-neutral-950 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-neutral-700"
    : "w-full px-4 py-3 text-[14px] text-slate-700 leading-relaxed resize-none bg-white focus:outline-none placeholder:text-slate-300";

  return (
    <div className={borderCard}>
      <div className={headerRow}>
        <span className={headerLabel}>{block.kind}</span>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
        >
          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
        </button>
      </div>
      <textarea
        ref={taRef}
        data-template-block-id={block.id}
        value={block.content}
        onChange={(e) => onChange(block.id, e.target.value)}
        onFocus={(e) => reportCaret(e.currentTarget)}
        onSelect={(e) => reportCaret(e.currentTarget)}
        onKeyUp={(e) => reportCaret(e.currentTarget)}
        onClick={(e) => reportCaret(e.currentTarget)}
        rows={block.kind === "text" ? 5 : 2}
        className={taClass}
        placeholder={`Enter ${block.kind} content`}
      />
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {vars.map((v) => (
          <button
            key={v}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertVarAtCursor(v)}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TemplateVariablesToolbar({
  vars,
  onInsert,
}: {
  vars: string[];
  onInsert: (name: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/35 px-3.5 py-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-widest block">
            Variables
          </Label>
          <p className="text-[10px] text-slate-500 dark:text-neutral-500 leading-snug">
            Subject or body blocks · inserts wherever the caret is.
          </p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Template variables"
      >
        {vars.map((v) => (
          <button
            key={v}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(v)}
            title={`Insert {{${v}}} at cursor`}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}
