"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Heading01Icon, TextIcon, EyeIcon } from "@hugeicons/core-free-icons";
import type { BlockKind } from "../../../lib/template-form-types";

const BLOCK_KINDS: {
  kind: BlockKind;
  icon: typeof Heading01Icon;
  label: string;
}[] = [
  { kind: "heading", icon: Heading01Icon, label: "Heading" },
  { kind: "text", icon: TextIcon, label: "Text" },
  { kind: "button", icon: EyeIcon, label: "Button" },
];

interface BlockToolbarProps {
  onAddBlock: (kind: BlockKind) => void;
}

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        Add block
      </span>
      <div className="flex flex-wrap gap-1.5">
        {BLOCK_KINDS.map(({ kind, icon, label }) => (
          <button
            key={kind}
            onClick={() => onAddBlock(kind)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 text-xs font-medium hover:border-[var(--theme-color)]/40 hover:text-[var(--theme-color)] hover:bg-[var(--theme-color)]/5 transition-all"
          >
            <HugeiconsIcon icon={icon} className="size-3" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
