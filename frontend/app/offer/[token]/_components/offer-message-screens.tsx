import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";

export function OfferLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
      <div className="flex items-center gap-2.5 text-slate-400 dark:text-neutral-500">
        <Spinner className="size-4" />
        <p className="text-sm font-medium">Loading offer…</p>
      </div>
    </div>
  );
}

export function OfferNotFound({ message }: { message: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="size-5 text-red-500 dark:text-red-400"
            strokeWidth={2}
          />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
          Offer not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {message || "This offer link is invalid or has expired."}
        </p>
      </div>
    </div>
  );
}
