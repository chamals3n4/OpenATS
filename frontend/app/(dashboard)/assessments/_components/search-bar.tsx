"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";

export function AssessmentSearchBar() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-64">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
        />
        <Input
          placeholder="Search assessments…"
          className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:border-slate-300 dark:focus-visible:border-neutral-600 focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
