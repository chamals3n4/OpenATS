"use client";

interface VariableButtonsProps {
  variables: string[];
}

export function VariableButtons({ variables }: VariableButtonsProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
          Variables
        </span>
        <span className="text-[11px] text-slate-400 dark:text-neutral-500">
          · click to copy
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 dark:bg-[var(--theme-color)]/10 dark:border-[var(--theme-color)]/30 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}
