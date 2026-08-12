"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar02Icon,
  Location01Icon,
  Link01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import { InterviewData } from "../types";
import ConfirmedState from "./confirmed-state";
import ErrorState from "./error-state";

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Props {
  data: InterviewData;
  token: string;
  apiBase: string;
}

export default function SlotPicker({ data, token, apiBase }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Slots discovered to be taken after page load (confirm attempt lost a race)
  const [takenIndexes, setTakenIndexes] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  // Fixed at mount so re-renders cannot reshuffle which slots read as past.
  const [now] = useState(() => Date.now());

  const handleConfirm = async () => {
    if (selectedSlot === null) return;
    setConfirming(true);
    setNotice(null);
    try {
      const res = await fetch(`${apiBase}/public/interview/${token}/select`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIndex: selectedSlot }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.code === "SLOT_TAKEN") {
          // Someone else confirmed this time — grey it out and let them retry
          setTakenIndexes((prev) => new Set(prev).add(selectedSlot));
          setSelectedSlot(null);
          setNotice(body.error);
          return;
        }
        throw new Error(body?.error ?? "Failed to confirm");
      }
      setConfirmed(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setConfirming(false);
    }
  };

  if (confirmed) return <ConfirmedState jobTitle={data.jobTitle} />;
  if (errorMsg) return <ErrorState message={errorMsg} />;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-[600px] mx-auto pt-14 pb-24 px-6 sm:px-8">
        <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
          Interview Scheduling
        </p>

        <h1 className="mt-4 text-3xl sm:text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-tight">
          {data.eventName}
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
          {[data.jobTitle, data.eventType === "virtual" ? "Virtual" : "On-site"]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {data.bodyText && (
          <p className="mt-8 text-sm leading-relaxed text-slate-600 dark:text-neutral-300 whitespace-pre-line">
            {data.bodyText}
          </p>
        )}

        {(data.meetingUrl || data.location) && (
          <div className="mt-8 space-y-2">
            {data.meetingUrl && (
              <div className="flex items-center gap-3 rounded-md bg-slate-100 dark:bg-neutral-800/60 px-4 py-3">
                <HugeiconsIcon
                  icon={Link01Icon}
                  className="size-4 shrink-0 text-slate-400 dark:text-neutral-500"
                />
                <a
                  href={data.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-700 dark:text-neutral-200 break-all hover:underline"
                >
                  {data.meetingUrl}
                </a>
              </div>
            )}
            {data.location && (
              <div className="flex items-center gap-3 rounded-md bg-slate-100 dark:bg-neutral-800/60 px-4 py-3">
                <HugeiconsIcon
                  icon={Location01Icon}
                  className="size-4 shrink-0 text-slate-400 dark:text-neutral-500"
                />
                <span className="text-sm text-slate-700 dark:text-neutral-200">
                  {data.location}
                </span>
              </div>
            )}
          </div>
        )}

        <h2 className="mt-12 text-xl font-semibold text-slate-900 dark:text-neutral-100">
          Pick a time
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          Select the slot that works best for you.
        </p>

        {notice && (
          <div className="mt-6 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            {notice}
          </div>
        )}

        <div className="mt-6 space-y-2.5">
          {(data.timeSlots ?? []).map((slot, i) => {
            const isPast = new Date(slot.datetime).getTime() <= now;
            const isTaken = !!slot.taken || takenIndexes.has(i);
            const isActive = selectedSlot === i;
            const disabled = slot.selected || isPast || isTaken;
            return (
              <button
                key={i}
                type="button"
                onClick={() => !disabled && setSelectedSlot(i)}
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors ${
                  isActive
                    ? "border-[var(--theme-color)] bg-(--theme-color)/5"
                    : disabled
                      ? "border-slate-200 dark:border-neutral-800 opacity-50 cursor-default"
                      : "border-slate-200 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-600 cursor-pointer"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <HugeiconsIcon
                    icon={Calendar02Icon}
                    className={`size-4 shrink-0 ${
                      isActive
                        ? "text-[var(--theme-color)]"
                        : "text-slate-400 dark:text-neutral-500"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 dark:text-neutral-100">
                      {fmtDate(slot.datetime)}
                    </span>
                    <span className="block text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
                      {fmtTime(slot.datetime)}
                    </span>
                  </span>
                </span>

                {isActive && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--theme-color)]">
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      className="size-3 text-white"
                      strokeWidth={3}
                    />
                  </span>
                )}
                {!isActive && isPast && !slot.selected && (
                  <span className="text-xs font-medium text-slate-400 dark:text-neutral-500 shrink-0">
                    Passed
                  </span>
                )}
                {!isActive && !isPast && !slot.selected && isTaken && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Unavailable
                  </span>
                )}
                {slot.selected && (
                  <span className="text-xs font-medium text-[var(--theme-color)] shrink-0">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedSlot === null || confirming}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 text-white px-6 h-11 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming && <Spinner className="size-3.5" />}
            {confirming ? "Confirming" : "Confirm this time"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-neutral-500 mt-8">
          {data.candidateName} · Powered by OpenATS
        </p>
      </div>
    </div>
  );
}
