"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

interface Props {
  jobTitle: string;
}

export default function ConfirmedState({ jobTitle }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-(--theme-color)/10">
          <HugeiconsIcon
            icon={Tick02Icon}
            className="size-5 text-[var(--theme-color)]"
            strokeWidth={2.5}
          />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
          You&apos;re all set
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          Your interview for <strong className="font-medium text-slate-700 dark:text-neutral-200">{jobTitle}</strong>{" "}
          is confirmed. A confirmation email with the details is on its way.
        </p>
        <p className="mt-8 text-xs text-slate-400 dark:text-neutral-500">
          Powered by OpenATS
        </p>
      </div>
    </div>
  );
}
