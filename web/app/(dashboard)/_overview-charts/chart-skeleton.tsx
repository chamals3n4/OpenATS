export function ChartSkeleton() {
  return (
    <div className="h-52 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
      <p className="text-xs text-slate-400 dark:text-neutral-500">Loading chart…</p>
    </div>
  );
}
