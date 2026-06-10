"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";

interface Props {
  jobTitle: string;
}

export default function ConfirmedState({ jobTitle }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-neutral-950">
      <div className="text-center max-w-md px-4">
        <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon
            icon={Tick02Icon}
            className="size-6 text-emerald-600"
          />
        </div>
        <h1 className="text-[20px] font-bold text-slate-900 dark:text-neutral-100 mb-2">
          Time Slot Confirmed!
        </h1>
        <p className="text-[14px] text-slate-500 dark:text-neutral-400">
          Your interview for <strong>{jobTitle}</strong> has been scheduled.
          You&apos;ll receive a confirmation email shortly.
        </p>
      </div>
    </div>
  );
}
