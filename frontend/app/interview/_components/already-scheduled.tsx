"use client";

import { Slot } from "../types";

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
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );
}

interface Props {
  timeSlots: Slot[] | null;
}

export default function AlreadyScheduled({ timeSlots }: Props) {
  const picked = timeSlots?.find((s) => s.selected);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-neutral-950">
      <div className="text-center max-w-md px-4">
        <h1 className="text-[20px] font-bold text-slate-900 dark:text-neutral-100 mb-2">
          Already Scheduled
        </h1>
        <p className="text-[14px] text-slate-500 dark:text-neutral-400">
          {picked
            ? `Confirmed for ${fmtDateTime(picked.datetime)}`
            : "This interview has already been scheduled."}
        </p>
      </div>
    </div>
  );
}
