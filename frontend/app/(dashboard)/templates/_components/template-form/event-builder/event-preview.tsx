"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon, Link01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { SAMPLE } from "../../../lib/template-form-constants";
import { isPastSlot } from "../../../lib/template-form-utils";
import { PreviewPane } from "../preview-pane";

interface EventPreviewPanelProps {
  eventName: string;
  eventType: "virtual" | "onsite";
  meetingUrl: string;
  autoGenerateMeet: boolean;
  location: string;
  slots: { datetime: string }[];
}

const fmtDate = (dt: string) =>
  new Date(dt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const fmtTime = (dt: string) => new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** A small copy of the page a candidate opens to pick their time (app/interview). */
export function EventPreviewPanel({
  eventName,
  eventType,
  meetingUrl,
  autoGenerateMeet,
  location,
  slots,
}: EventPreviewPanelProps) {
  const [now] = useState(() => Date.now());
  const offered = slots.filter((s) => s.datetime && !isPastSlot(s.datetime, now));
  const place =
    eventType === "onsite"
      ? location.trim()
      : autoGenerateMeet
        ? "Google Meet link, added when the interview is scheduled"
        : meetingUrl.trim();

  return (
    <PreviewPane note={`This is what a candidate sees. "${SAMPLE.job_title}" stands in for the job.`}>
      <div className="px-6 py-6">
        <p className="text-[13px] font-medium text-slate-500 dark:text-neutral-400">Interview Scheduling</p>
        <p
          className={`mt-2 text-2xl font-semibold leading-tight ${
            eventName.trim() ? "text-slate-900 dark:text-neutral-100" : "text-slate-400 dark:text-neutral-500"
          }`}
        >
          {eventName.trim() || "Event name"}
        </p>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-neutral-400">
          {SAMPLE.job_title} · {eventType === "virtual" ? "Virtual" : "On-site"}
        </p>

        {place && (
          <div className="mt-5 flex items-center gap-3 rounded-md bg-slate-100 px-4 py-3 dark:bg-neutral-800/60">
            <HugeiconsIcon
              icon={eventType === "onsite" ? Location01Icon : Link01Icon}
              className="size-4 shrink-0 text-slate-500 dark:text-neutral-400"
            />
            <span className="break-all text-sm text-slate-700 dark:text-neutral-200">{place}</span>
          </div>
        )}

        <p className="mt-7 text-base font-semibold text-slate-900 dark:text-neutral-100">Pick a time</p>
        {offered.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
            Add a time slot to see it here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {offered.map((slot, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-neutral-800"
              >
                <HugeiconsIcon icon={Calendar02Icon} className="size-4 shrink-0 text-slate-500 dark:text-neutral-400" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-neutral-100">
                    {fmtDate(slot.datetime)}
                  </span>
                  <span className="block text-sm text-slate-500 dark:text-neutral-400">{fmtTime(slot.datetime)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PreviewPane>
  );
}
