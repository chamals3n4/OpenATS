"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Heading01Icon, TextIcon, EyeIcon } from "@hugeicons/core-free-icons";
import type { BlockKind } from "../../../lib/template-form-types";

const BLOCK_KINDS: {
  kind: BlockKind;
  icon: typeof Heading01Icon;
  label: string;
}[] = [
  { kind: "heading", icon: Heading01Icon, label: "heading" },
  { kind: "text", icon: TextIcon, label: "text" },
  { kind: "button", icon: EyeIcon, label: "button" },
];

interface BlockToolbarProps {
  onAddBlock: (kind: BlockKind) => void;
}

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
        Content Blocks
      </span>
      <div className="flex flex-wrap gap-2">
        {BLOCK_KINDS.map(({ kind, icon, label }) => (
          <button
            key={kind}
            onClick={() => onAddBlock(kind)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 text-[13px] font-medium hover:border-[var(--theme-color)]/40 hover:text-[var(--theme-color)] transition-all"
          >
            <HugeiconsIcon icon={icon} className="size-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
