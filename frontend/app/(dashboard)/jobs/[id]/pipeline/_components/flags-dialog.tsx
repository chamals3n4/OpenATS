"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { candidateFlags, formatScore } from "@/lib/scoring";
import type { BoardCandidate } from "@/types";

interface FlagsDialogProps {
  candidate: BoardCandidate;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProfile: (id: number) => void;
}

/** Spells out a card's flags, which are an icon on the card because a board column is narrow. */
export function FlagsDialog({ candidate, name, open, onOpenChange, onOpenProfile }: FlagsDialogProps) {
  const flags = candidateFlags(candidate);
  const parts =
    candidate.scoredParts !== undefined && candidate.weightedParts
      ? ` · ${candidate.scoredParts} of ${candidate.weightedParts} parts scored`
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[460px] dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
            Flags for {name}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
            Score {formatScore(candidate.totalScore)}
            {parts}. Flags are warnings for you to review. They never change the score.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 px-6 py-5">
          {flags.map((flag) => (
            <li
              key={flag.key}
              className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30"
            >
              <HugeiconsIcon
                icon={Alert02Icon}
                className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">{flag.label}</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-neutral-300">{flag.explanation}</p>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter className="border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
          <Button type="button" variant="cancel" onClick={() => onOpenChange(false)} className="h-9 px-4 text-sm">
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onOpenProfile(candidate.id);
            }}
            className="h-9 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            Open profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
