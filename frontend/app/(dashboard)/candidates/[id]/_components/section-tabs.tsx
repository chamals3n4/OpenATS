"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { SECTIONS, SectionId } from "./constants";
import type { CandidateCvAnalysisPayload } from "@/types";

interface SectionTabsProps {
  /** The tabs to show. The AI analysis tab is left out while that feature is off. */
  sections: typeof SECTIONS;
  activeSection: SectionId;
  onSectionChange: (id: SectionId) => void;
  cvAnalysis?: CandidateCvAnalysisPayload | null;
  hasOffer: boolean;
  offerDotColor?: string;
}

export function SectionTabs({
  sections,
  activeSection,
  onSectionChange,
  cvAnalysis,
  hasOffer,
  offerDotColor,
}: SectionTabsProps) {
  return (
    <div className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-300 bg-transparent p-1 shadow-none dark:border-neutral-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {sections.map((s) => {
        const isActive = activeSection === s.id;
        const hasPendingCv =
          s.id === "ai-analysis" && cvAnalysis?.status === "pending";
        const showOfferDot = s.id === "offer" && hasOffer;

        return (
          <button
            key={s.id}
            onClick={() => onSectionChange(s.id)}
            className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium leading-none transition-colors ${
              isActive
                ? "border-none bg-[var(--theme-color)] text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                : "border-none bg-slate-200/70 text-slate-800 hover:bg-slate-200 hover:text-slate-950 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"
            }`}
          >
            <HugeiconsIcon icon={s.icon} className="size-3.5" />
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
