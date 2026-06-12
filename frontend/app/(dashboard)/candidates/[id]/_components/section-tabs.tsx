"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { SECTIONS, type SectionId } from "./constants";

interface SectionTabsProps {
  activeSection: SectionId;
  onSectionChange: (id: SectionId) => void;
  cvAnalysis?: any;
  hasOffer: boolean;
  offerDotColor?: string;
}

export function SectionTabs({
  activeSection,
  onSectionChange,
  cvAnalysis,
  hasOffer,
  offerDotColor,
}: SectionTabsProps) {
  return (
    <div className="mb-5 flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-[6px] border border-slate-300 bg-white p-1.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {SECTIONS.map((s) => {
        const isActive = activeSection === s.id;
        const hasPendingCv =
          s.id === "job-fit" && cvAnalysis?.status === "pending";
        const showOfferDot = s.id === "offer" && hasOffer;

        return (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border px-2.5 text-[13px] font-semibold leading-none transition-colors ${
              isActive
                ? "border-none bg-[var(--theme-color)] text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                : "border-none bg-neutral-100 text-slate-700 hover:bg-neutral-200 hover:text-slate-950 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
            }`}
          >
            <HugeiconsIcon icon={s.icon} className="size-3" />
            <span>{s.label}</span>
            {hasPendingCv && (
              <span className="size-2 rounded-full bg-amber-400" />
            )}
            {showOfferDot && (
              <span
                className={`size-2 rounded-full ${offerDotColor ?? "bg-slate-400"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
