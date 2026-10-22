import type { Kpi, Tone } from "../../_lib/overview-utils";
import { cardCls } from "./card";

const TONE: Record<Tone, string> = {
  good: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  bad: "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
  neutral:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

interface KpiCardsProps {
  kpis: Kpi[];
  /** e.g. "the previous 7 days" */
  comparedWith: string;
  isLoading: boolean;
}

/** The key figures as one compact strip of plain numbers */
export function KpiCards({ kpis, comparedWith, isLoading }: KpiCardsProps) {
  const count = isLoading ? 3 : kpis.length;
  return (
    <section
      aria-label="Key figures"
      className={`${cardCls} grid grid-cols-1 divide-y divide-slate-300 sm:divide-y-0 sm:divide-x dark:divide-neutral-700 ${
        count > 3 ? "sm:grid-cols-4" : "sm:grid-cols-3"
      }`}
    >
      {isLoading
        ? Array.from({ length: count }, (_, i) => (
            <div key={i} className="m-4 h-12 animate-pulse rounded-md bg-slate-100 dark:bg-neutral-800" />
          ))
        : kpis.map((kpi) => (
            <article key={kpi.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-slate-600 dark:text-neutral-400">{kpi.label}</h2>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-neutral-500">{kpi.hint}</p>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                <p className="text-2xl leading-none font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                  {kpi.value}
                </p>
                {kpi.unit && <span className="text-sm text-slate-500 dark:text-neutral-400">{kpi.unit}</span>}
                {kpi.delta && (
                  <span
                    title={`Compared with ${comparedWith}`}
                    className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${TONE[kpi.delta.tone]}`}
                  >
                    {kpi.delta.text}
                  </span>
                )}
              </div>
            </article>
          ))}
    </section>
  );
}
