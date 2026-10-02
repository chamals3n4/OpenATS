/** Shown in a chart's place when there is nothing to plot. */
export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center px-6 text-center">
      <p className="text-sm text-slate-500 dark:text-neutral-400">{message}</p>
    </div>
  );
}
