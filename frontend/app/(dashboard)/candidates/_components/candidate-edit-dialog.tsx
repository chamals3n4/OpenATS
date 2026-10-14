"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useState } from "react";
import { useUpdateCandidateBasicDetails } from "@/hooks/queries/use-candidates";
import type { Candidate } from "@/types";
import {
  buildUpdateFormData,
  candidateToFormData,
  type CandidateFormData,
} from "../_lib/candidate-types";

const fieldClassName =
  "h-10! rounded-lg border border-slate-300 bg-gray-100 shadow-none placeholder:text-slate-400 focus-visible:!border-slate-500 focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus-visible:!border-neutral-400";

interface CandidateEditDialogProps {
  // Candidate to edit, null when closed
  candidate: Candidate | null;
  onClose: () => void;
}

export function CandidateEditDialog({ candidate, onClose }: CandidateEditDialogProps) {
  const updateMutation = useUpdateCandidateBasicDetails();

  return (
    <Dialog
      open={!!candidate}
      onOpenChange={(o) => !o && !updateMutation.isPending && onClose()}
    >
      <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        {/* Keyed so the fields reset for each candidate */}
        {candidate && (
          <EditForm
            key={candidate.id}
            candidate={candidate}
            isPending={updateMutation.isPending}
            onSave={(formData) =>
              updateMutation.mutate(
                { id: candidate.id, formData: buildUpdateFormData(formData) },
                { onSuccess: onClose },
              )
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  candidate,
  isPending,
  onSave,
}: {
  candidate: Candidate;
  isPending: boolean;
  onSave: (formData: CandidateFormData) => void;
}) {
  const [formData, setFormData] = useState(() => candidateToFormData(candidate));

  const updateField = <K extends keyof CandidateFormData>(
    field: K,
    value: CandidateFormData[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
            Edit Candidate
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
              First name
            </p>
            <Input
              value={formData.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              className={fieldClassName}
            />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
              Last name
            </p>
            <Input
              value={formData.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              className={fieldClassName}
            />
          </div>

          <div className="col-span-2">
            <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
              Email
            </p>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={fieldClassName}
            />
          </div>

          <div className="col-span-2">
            <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5">
              Phone
            </p>
            <Input
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={fieldClassName}
              placeholder="Optional"
            />
          </div>

          <div className="col-span-2">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-slate-600 dark:text-neutral-400">
                Upload new CV (PDF)
              </p>
              {candidate.hasResume ? (
                <a
                  href={`/api/candidates/${candidate.id}/resume`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-[12px] font-medium text-theme hover:underline whitespace-nowrap"
                >
                  View current CV
                </a>
              ) : (
                <p className="text-[12px] text-slate-400">No CV uploaded yet</p>
              )}
            </div>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) =>
                updateField("resumeFile", e.target.files?.[0] ?? null)
              }
              className={`${fieldClassName} pt-2 file:text-sm`}
            />
            <p className="text-[12px] text-slate-400 mt-1">
              If uploaded, the existing CV will be replaced.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose
            disabled={isPending}
            className="h-9 cursor-pointer rounded-md border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 shadow-none hover:bg-slate-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </DialogClose>
          <Button
            onClick={() => onSave(formData)}
            disabled={isPending}
            className="h-9 cursor-pointer gap-2 rounded-md border-none px-4 text-sm font-medium text-white shadow-none"
            style={{ backgroundColor: "var(--theme-color)" }}
          >
            {isPending && <Spinner className="size-3.5" />}
            {isPending ? "Saving" : "Save changes"}
          </Button>
        </DialogFooter>
    </>
  );
}
