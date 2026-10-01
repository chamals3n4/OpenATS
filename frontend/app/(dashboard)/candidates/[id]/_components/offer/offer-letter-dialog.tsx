"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SandboxedHtmlPreview } from "../sandboxed-html-preview";

interface OfferLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  candidateName: string;
}

/** The letter in a dialog, so reading it never means scrolling the tab. */
export function OfferLetterDialog({
  open,
  onOpenChange,
  html,
  candidateName,
}: OfferLetterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-4 border-slate-200 bg-white p-6 sm:max-w-3xl dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Offer letter
          </DialogTitle>
          <DialogDescription>
            What {candidateName} receives with the offer.
          </DialogDescription>
        </DialogHeader>
        <SandboxedHtmlPreview html={html} title="Offer letter preview" className="h-[62vh]" />
        <DialogFooter>
          <Button
            variant="cancel"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
