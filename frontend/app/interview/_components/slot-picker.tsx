"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InterviewData, Slot } from "../types";

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
  data: InterviewData;
  token: string;
  apiBase: string;
  onConfirmed: () => void;
  onError: (msg: string) => void;
}

export default function SlotPicker({
  data,
  token,
  apiBase,
  onConfirmed,
  onError,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (selectedSlot === null) return;
    setConfirming(true);
    try {
      const res = await fetch(`${apiBase}/public/interview/${token}/select`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIndex: selectedSlot }),
      });
      if (!res.ok) throw new Error("Failed to confirm");
      onConfirmed();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-neutral-800">
            <h1 className="text-[20px] font-bold text-slate-900 dark:text-neutral-100">
              {data.eventName}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[14px] text-slate-500 dark:text-neutral-400">
                {data.jobTitle}
              </span>
              <Badge className="rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                {data.eventType === "virtual" ? "Virtual" : "On-site"}
              </Badge>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {data.bodyText && (
              <p className="text-[14px] text-slate-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                {data.bodyText}
              </p>
            )}

            {data.meetingUrl && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3">
                <p className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  Meeting Link
                </p>
                <a
                  href={data.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-blue-700 dark:text-blue-300 break-all hover:underline"
                >
                  {data.meetingUrl}
                </a>
              </div>
            )}

            <div>
              <p className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200 mb-3">
                Select a time slot:
              </p>
              <div className="space-y-2">
                {(data.timeSlots ?? []).map((slot, i) => (
                  <Button
                    key={i}
                    onClick={() => setSelectedSlot(i)}
                    disabled={slot.selected}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      slot.selected
                        ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 cursor-default"
                        : selectedSlot === i
                          ? "border-[var(--theme-color)] bg-(--theme-color)/5"
                          : "border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon
                        icon={Calendar02Icon}
                        className="size-4 text-slate-400"
                      />
                      <span
                        className={`text-[14px] font-semibold ${
                          slot.selected
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-700 dark:text-neutral-300"
                        }`}
                      >
                        {fmtDateTime(slot.datetime)}
                      </span>
                      {slot.selected && (
                        <Badge className="rounded-md border-none px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 ml-auto">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50">
            <Button
              onClick={handleConfirm}
              disabled={selectedSlot === null || confirming}
              className="w-full h-10 rounded-lg border-none bg-[var(--theme-color)] text-[14px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
            >
              {confirming ? "Confirming..." : "Confirm This Time Slot"}
            </Button>
          </div>
        </div>

        <p className="text-center text-[12px] text-slate-400 dark:text-neutral-500 mt-4">
          {data.candidateName} · Powered by OpenATS
        </p>
      </div>
    </div>
  );
}
