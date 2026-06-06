"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import { REJECTION_REASONS } from "../constants.ts";

interface RejectCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  candidateId: number;
  emailTemplates: any[];
  rejectMutation: any;
}

export function RejectCandidateDialog({
  open,
  onOpenChange,
  candidate,
  candidateId,
  emailTemplates,
  rejectMutation,
}: RejectCandidateDialogProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [rejectInternalNote, setRejectInternalNote] = useState("");
  const [rejectTemplateId, setRejectTemplateId] = useState("");
  const [shouldSendRejectEmail, setShouldSendRejectEmail] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(open) => onOpenChange(open)}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
            Reject {candidate?.firstName} {candidate?.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
              Rejection Reason
            </Label>
            <Select
              value={rejectReason}
              onValueChange={(v) => setRejectReason(v ?? "")}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem
                    key={reason}
                    value={reason}
                    className="text-[13px]"
                  >
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
              Internal Note (optional)
            </Label>
            <textarea
              value={rejectInternalNote}
              onChange={(e) => setRejectInternalNote(e.target.value)}
              placeholder="Visible to your team only"
              className="min-h-[90px] w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-[13px] text-slate-700 dark:text-neutral-300 shadow-none focus:outline-none focus:border-[var(--theme-color)]"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-neutral-700 px-3 py-2">
            <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
              Send Rejection Email
            </Label>
            <Switch
              checked={shouldSendRejectEmail}
              onCheckedChange={setShouldSendRejectEmail}
            />
          </div>

          {shouldSendRejectEmail && (
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
                Email Template
              </Label>
              <Select
                value={rejectTemplateId}
                onValueChange={(v) => setRejectTemplateId(v ?? "")}
              >
                <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                  {emailTemplates.map((t: any) => (
                    <SelectItem
                      key={t.id}
                      value={String(t.id)}
                      className="text-[13px]"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md border-none bg-neutral-700 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-neutral-600"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={
              rejectMutation.isPending ||
              !rejectReason ||
              (shouldSendRejectEmail && !rejectTemplateId)
            }
            onClick={() => {
              rejectMutation.mutate(
                {
                  id: candidateId,
                  data: {
                    reason: rejectReason,
                    internalNote: rejectInternalNote || undefined,
                    templateId: shouldSendRejectEmail
                      ? Number(rejectTemplateId)
                      : undefined,
                    emailStatus: shouldSendRejectEmail ? "sent" : "not_sent",
                  },
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setRejectReason("");
                    setRejectInternalNote("");
                    setRejectTemplateId("");
                    setShouldSendRejectEmail(false);
                  },
                },
              );
            }}
            className="h-8 rounded-md border-none bg-red-600 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-red-500 disabled:opacity-60"
          >
            {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
