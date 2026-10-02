import type { Kpi, Tone } from "../../lib/overview-utils";
import { cardCls } from "./card";

const TONE: Record<Tone, string> = {
  good: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  bad: "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
  neutral:
    "border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

interface KpiCardsProps {
  kpis: Kpi[];
  /** Words for the period compared against, e.g. "the previous 7 days". */
  comparedWith: string;
  isLoading: boolean;
}

export function KpiCards({ kpis, comparedWith, isLoading }: KpiCardsProps) {
  const count = isLoading ? 4 : kpis.length;
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${count > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
    >
      {isLoading
        ? [0, 1, 2, 3].map((i) => (
            <div key={i} className={`${cardCls} h-[116px] animate-pulse bg-slate-100 dark:bg-neutral-800`} />
          ))
        : kpis.map((kpi) => (
            <article key={kpi.key} className={`${cardCls} px-5 py-4`}>
              <h2 className="text-sm font-medium text-slate-600 dark:text-neutral-400">{kpi.label}</h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-3xl leading-none font-semibold tabular-nums text-slate-900 dark:text-neutral-100">
                  {kpi.value}
                </p>
                {kpi.unit && (
                  <span className="text-sm text-slate-500 dark:text-neutral-400">{kpi.unit}</span>
                )}
                {kpi.delta && (
                  <span
                    title={`Compared with ${comparedWith}`}
                    className={`ml-auto rounded-md border px-2 py-0.5 text-xs font-medium ${TONE[kpi.delta.tone]}`}
                  >
                    {kpi.delta.text}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">{kpi.hint}</p>
            </article>
          ))}
    </div>
  );
}
