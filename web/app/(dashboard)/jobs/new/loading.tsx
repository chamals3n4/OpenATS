import { Loader2 } from "lucide-react";

export default function CreateJobLoading() {
  return (
    <div className="flex flex-1 min-h-[50vh] items-center justify-center bg-white dark:bg-neutral-950">
      <Loader2
        className="size-9 animate-spin text-slate-400 dark:text-neutral-500"
        aria-label="Loading"
        style={{ color: "var(--theme-color)" }}
      />
    </div>
  );
}
