import { cn } from "@/lib/utils";
import { describeParts, formatScore, scoreTone, type ScoreTone } from "@/lib/scoring";

const TONE_CLASS: Record<ScoreTone, string> = {
  none: "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400",
  high: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  mid: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  low: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

interface ScoreBadgeProps {
  total: string | number | null | undefined;
  scoredParts?: number | undefined;
  weightedParts?: number | undefined;
  knockedOut?: boolean | undefined;
  assessmentPassed?: boolean | null | undefined;
  assessmentExpired?: boolean | undefined;
  /** "full" for headers, "compact" for rows and cards */
  size?: "compact" | "full";
  /** Hide the flag pills */
  hideFlags?: boolean;
  /** Render nothing when there is no score or flag */
  hideWhenUnscored?: boolean;
  className?: string;
}

/** Total score with the number of parts and flags */
export function ScoreBadge({
  total,
  scoredParts,
  weightedParts,
  knockedOut,
  assessmentPassed,
  assessmentExpired,
  size = "compact",
  hideWhenUnscored,
  hideFlags,
  className,
}: ScoreBadgeProps) {
  const parts = describeParts(scoredParts, weightedParts);
  const full = size === "full";
  const unscored = total === null || total === undefined;
  const hasFlag = !!knockedOut || assessmentPassed === false || !!assessmentExpired;
  if (hideWhenUnscored && unscored && (hideFlags || !hasFlag)) return null;
  const flags = [
    knockedOut ? "Does not meet requirements" : null,
    assessmentPassed === false ? "Failed assessment" : null,
    assessmentExpired ? "Assessment expired" : null,
  ].filter((f): f is string => f !== null);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={[parts ?? "Not scored yet", ...flags].join(" · ")}
    >
      <span
        aria-label={total === null || total === undefined ? "Not scored yet" : `Score ${formatScore(total)} out of 100`}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-semibold tabular-nums",
          full ? "h-6 min-w-10 px-2 text-sm" : "h-6 min-w-8 px-1.5 text-xs",
          TONE_CLASS[scoreTone(total)],
        )}
      >
        {formatScore(total)}
      </span>
      {scoredParts !== undefined && weightedParts !== undefined && weightedParts > 0 && (
        <span
          aria-label={parts ?? undefined}
          className={cn("tabular-nums text-slate-500 dark:text-neutral-400", full ? "text-sm" : "text-[11px]")}
        >
          {scoredParts}/{weightedParts}
        </span>
      )}
      {!hideFlags && knockedOut && (
        <span
          className={cn(
            "rounded-full bg-red-50 font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400",
            full ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[10px]",
          )}
        >
          {full ? "Does not meet requirements" : "Knockout"}
        </span>
      )}
      {!hideFlags && assessmentPassed === false && (
        <span
          className={cn(
            "rounded-full bg-amber-50 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
            full ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[10px]",
          )}
        >
          {full ? "Failed assessment" : "Failed test"}
        </span>
      )}
      {!hideFlags && assessmentExpired && (
        <span
          className={cn(
            "rounded-full bg-amber-50 font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
            full ? "px-2 py-0.5 text-xs" : "px-1.5 py-px text-[10px]",
          )}
        >
          {full ? "Assessment expired" : "Test expired"}
        </span>
      )}
    </span>
  );
}
