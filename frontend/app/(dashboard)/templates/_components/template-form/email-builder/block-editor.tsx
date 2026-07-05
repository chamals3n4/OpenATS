"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import type { Block } from "../../../lib/template-form-types";

interface BlockEditorProps {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export function BlockEditor({ block, onUpdate, onDelete, readOnly = false }: BlockEditorProps) {
  return (
    <div className="border border-slate-200 dark:border-neutral-700 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-neutral-800/80 border-b border-slate-200 dark:border-neutral-700">
        <span className="text-xs font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
          {block.kind}
        </span>
        {!readOnly && (
          <button
            onClick={() => onDelete(block.id)}
            className="text-slate-300 dark:text-neutral-600 hover:text-red-500 transition-colors"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </button>
        )}
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onUpdate(block.id, e.target.value)}
        readOnly={readOnly}
        rows={block.kind === "text" ? 4 : 2}
        className="w-full px-3 py-2.5 text-sm bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 leading-relaxed resize-none focus:outline-none placeholder:text-slate-300 dark:placeholder:text-neutral-600"
      />
    </div>
  );
}
