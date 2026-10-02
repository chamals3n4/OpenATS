export function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className="h-56 w-full animate-pulse rounded-md bg-slate-100 dark:bg-neutral-800"
    />
  );
}
