import type { ReactNode } from "react";

/** The right-hand side of a builder: a framed copy of what the candidate will receive. */
export function PreviewPane({ note, children }: { note: string; children: ReactNode }) {
  return (
    <div className="min-h-full px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[600px]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-neutral-400">
          Preview
        </h2>
        <div className="mt-3 overflow-hidden rounded-md border border-slate-300 dark:border-neutral-700">
          {children}
        </div>
        <p className="mt-3 text-[13px] text-slate-500 dark:text-neutral-400">{note}</p>
      </div>
    </div>
  );
}
