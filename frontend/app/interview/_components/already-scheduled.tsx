"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon } from "@hugeicons/core-free-icons";
import { Slot } from "../types";
import { useViewerTimeZone, zoneLabel } from "../_lib/viewer-time-zone";

function fmtDateTime(dt: string) {
  const d = new Date(dt);
  return (
    d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

interface Props {
  timeSlots: Slot[] | null;
}

export default function AlreadyScheduled({ timeSlots }: Props) {
  const picked = timeSlots?.find((s) => s.selected);
  // Written only once the candidate's own zone is known, never in the server's.
  const timeZone = useViewerTimeZone();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-950 px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-(--theme-color)/10">
          <HugeiconsIcon
            icon={Calendar02Icon}
            className="size-5 text-[var(--theme-color)]"
            strokeWidth={2}
          />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
          Already scheduled
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {picked && timeZone
            ? `Your interview is confirmed for ${fmtDateTime(picked.datetime)} (${zoneLabel(timeZone, new Date(picked.datetime))}).`
            : picked
              ? "Your interview is confirmed."
              : "This interview has already been scheduled."}
        </p>
        <p className="mt-8 text-xs text-slate-400 dark:text-neutral-500">
          Powered by OpenATS
        </p>
      </div>
    </div>
  );
}
