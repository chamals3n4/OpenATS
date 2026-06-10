"use client";

interface VariableButtonsProps {
  variables: string[];
}

export function VariableButtons({ variables }: VariableButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
          Variables
        </span>
        <span className="text-xs font-normal text-slate-400 dark:text-neutral-500">
          · click to copy
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {variables.map((v) => (
          <button
            key={v}
            onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
            className="text-[12px] font-mono px-2.5 py-1 rounded-md bg-[var(--theme-color)]/8 border border-[var(--theme-color)]/20 text-[var(--theme-color)] hover:bg-[var(--theme-color)]/15 dark:bg-[var(--theme-color)]/10 dark:border-[var(--theme-color)]/30 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}
