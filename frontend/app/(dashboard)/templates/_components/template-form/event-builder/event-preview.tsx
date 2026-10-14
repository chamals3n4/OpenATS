"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Link01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { SAMPLE } from "../../../_lib/template-form-constants";
import { formatDuration } from "../../../../_lib/format-duration";
import { PreviewPane } from "../preview-pane";

interface EventPreviewPanelProps {
  eventName: string;
  eventType: "virtual" | "onsite";
  meetingUrl: string;
  autoGenerateMeet: boolean;
  location: string;
  durationMinutes: number;
  message: string;
}

/** Small preview of the candidate's time picker page */
export function EventPreviewPanel({
  eventName,
  eventType,
  meetingUrl,
  autoGenerateMeet,
  location,
  durationMinutes,
  message,
}: EventPreviewPanelProps) {
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
          {SAMPLE.job_title} · {eventType === "virtual" ? "Virtual" : "On-site"} · {formatDuration(durationMinutes)}
        </p>

        {message.trim() && (
          <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
            {message.trim()}
          </p>
        )}

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
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
          The times you offer when scheduling appear here.
        </p>
      </div>
    </PreviewPane>
  );
}
