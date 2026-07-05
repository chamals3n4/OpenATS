"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: any;
  firstName: string;
  onFirstNameChange: (v: string) => void;
  lastName: string;
  onLastNameChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  resumeFile: File | null;
  onResumeFileChange: (f: File | null) => void;
  onSave: () => void;
  isPending: boolean;
}

export function EditCandidateDialog({
  open,
  onOpenChange,
  candidate,
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  resumeFile,
  onResumeFileChange,
  onSave,
  isPending,
}: EditCandidateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-neutral-100">
            Edit Candidate
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                First name
              </Label>
              <Input
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                className="h-10 rounded-md border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Last name
              </Label>
              <Input
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                className="h-10 rounded-md border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="h-10 rounded-md border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                className="h-10 rounded-md border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Upload new CV (PDF)
                </Label>
                {candidate?.resumeUrl ? (
                  <a
                    href={candidate.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[var(--theme-color)] hover:underline"
                  >
                    View current CV
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">
                    No CV uploaded yet
                  </p>
                )}
              </div>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  onResumeFileChange(e.target.files?.[0] ?? null)
                }
                className="h-10 rounded-md border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)] pt-2.5 file:text-sm"
              />
              <p className="text-xs text-slate-400">
                If uploaded, the existing CV will be replaced.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 pt-0 gap-2">
          <DialogClose
            disabled={isPending}
            className="h-7 rounded-md border-none bg-neutral-800 px-2.5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer"
          >
            Cancel
          </DialogClose>
          <Button
            onClick={onSave}
            disabled={isPending}
            className="h-7 rounded-md border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold text-white shadow-none transition-colors hover:bg-[var(--theme-color-hover)] disabled:opacity-60 cursor-pointer"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
