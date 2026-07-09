"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="size-5 text-red-500 dark:text-red-400"
            strokeWidth={2}
          />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {message || "This link is invalid or has expired."}
        </p>
        <p className="mt-8 text-xs text-slate-400 dark:text-neutral-500">
          Powered by OpenATS
        </p>
      </div>
    </div>
  );
}
