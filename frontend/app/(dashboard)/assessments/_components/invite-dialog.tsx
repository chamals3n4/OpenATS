"use client";

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  CheckmarkCircle01Icon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import type { Assessment, Candidate } from "@/types";

interface AssessmentInviteDialogProps {
  assessment: Assessment | null;
  candidates: Candidate[];
  selectedCandidateId: string;
  onCandidateChange: (id: string) => void;
  generatedLink: string | null;
  copied: boolean;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  onGenerateLink: () => void;
  onCopyLink: () => void;
  onClose: () => void;
}

export function AssessmentInviteDialog({
  assessment,
  candidates,
  selectedCandidateId,
  onCandidateChange,
  generatedLink,
  copied,
  isPending,
  isError,
  error,
  onGenerateLink,
  onCopyLink,
  onClose,
}: AssessmentInviteDialogProps) {
  return (
    <Dialog open={!!assessment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-xl border-slate-200 dark:border-neutral-800 shadow-lg p-6 bg-white dark:bg-neutral-950">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
            Invite Candidate
          </DialogTitle>
          <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-1">
            Generates a unique assessment link for the selected candidate.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
              Assessment
            </Label>
            <p className="text-[14px] font-medium text-slate-700 dark:text-neutral-300">
              {assessment?.title}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
              Select Candidate
            </Label>
            <Select
              value={selectedCandidateId}
              onValueChange={(v) => onCandidateChange(v ?? "")}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                <SelectValue placeholder="Choose a candidate…" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                {candidates.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={String(c.id)}
                    className="text-[13px]"
                  >
                    {c.firstName} {c.lastName}
                    {c.jobTitle ? ` — ${c.jobTitle}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!generatedLink ? (
            <Button
              onClick={onGenerateLink}
              disabled={!selectedCandidateId || isPending}
              className="w-full h-10 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg text-[13px] font-medium gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate Link"
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                Assessment Link
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-[12px] text-slate-600 dark:text-neutral-300 truncate font-mono">
                  {generatedLink}
                </div>
                <button
                  onClick={onCopyLink}
                  className={`shrink-0 h-9 px-3 rounded-lg text-[12px] font-medium border inline-flex items-center gap-1.5 ${
                    copied
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                      : "border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <HugeiconsIcon
                    icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                    className="size-3.5"
                  />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <a
                href={generatedLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--theme-color)] font-medium hover:underline"
              >
                <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" />
                Open in new tab
              </a>
            </div>
          )}

          {isError && (
            <p className="text-red-500 text-[12px]">
              {error?.message ?? "Failed to generate invite."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
