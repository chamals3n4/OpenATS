"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface TemplatesHeaderProps {
  onNewTemplate: () => void;
}

export function TemplatesHeader({ onNewTemplate }: TemplatesHeaderProps) {
  return (
    <div className="px-8 py-4 flex items-center justify-between">
      <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
        Templates
      </h1>
      <Button
        onClick={onNewTemplate}
        className="bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-4 flex items-center gap-2 border-none shadow-none text-sm font-medium transition-colors"
      >
        <HugeiconsIcon
          icon={PlusSignIcon}
          className="size-4"
          strokeWidth={2.5}
        />
        <span>New Template</span>
      </Button>
    </div>
  );
}
