import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const SPINNER_CLASS = "size-8 text-muted-foreground";

export function DashboardMainLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-1 min-h-[min(60vh,calc(100svh-var(--header-height)-4rem))] w-full items-center justify-center p-8",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner className={SPINNER_CLASS} />
    </div>
  );
}

export function ListSectionSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[12rem] items-center justify-center py-8",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner className={SPINNER_CLASS} />
    </div>
  );
}
