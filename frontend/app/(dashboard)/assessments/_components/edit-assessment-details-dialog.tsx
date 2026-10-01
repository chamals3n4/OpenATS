"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUpdateAssessment } from "@/hooks/queries/use-assessments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AssessmentDetails {
  title: string;
  description: string;
  timeLimit: number;
}

interface EditAssessmentDetailsDialogProps {
  assessmentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: AssessmentDetails;
  onSaved: (details: AssessmentDetails) => void;
}

function DetailsForm({
  assessmentId,
  details,
  onClose,
  onSaved,
}: Omit<EditAssessmentDetailsDialogProps, "open" | "onOpenChange"> & {
  onClose: () => void;
}) {
  const updateAssessment = useUpdateAssessment(assessmentId);
  const [title, setTitle] = useState(details.title);
  const [description, setDescription] = useState(details.description);
  const [timeLimit, setTimeLimit] = useState(String(details.timeLimit));

  const handleSave = () => {
    const limit = Number(timeLimit);
    if (!title.trim()) return toast.warning("Assessment title is required.");
    if (!Number.isInteger(limit) || limit < 1) {
      return toast.warning("Time limit must be a whole number of minutes.");
    }

    const next = {
      title: title.trim(),
      description: description.trim(),
      timeLimit: limit,
    };
    updateAssessment.mutate(
      { ...next, description: next.description || null },
      {
        onSuccess: () => {
          toast.success("Assessment details updated");
          onSaved(next);
          onClose();
        },
        onError: (error) =>
          toast.error(error.message || "Failed to update assessment"),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          Assessment details
        </DialogTitle>
        <DialogDescription>
          Changes here are saved straight away. Question changes still need
          &ldquo;Update Assessment&rdquo;.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">
            Assessment title
          </Label>
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Frontend Developer Assessment"
            className="h-10 rounded-md border-slate-300 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should this assessment evaluate?"
            rows={3}
            className="resize-y border-slate-300 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </div>
        <div className="w-44">
          <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">
            Time limit (minutes)
          </Label>
          <Input
            type="number"
            min="1"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            className="h-10 rounded-md border-slate-300 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="cancel"
          onClick={onClose}
          disabled={updateAssessment.isPending}
          className="h-9"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateAssessment.isPending}
          className="h-9 gap-2 bg-theme text-white hover:bg-theme-hover"
        >
          {updateAssessment.isPending && <Spinner className="size-3.5" />}
          {updateAssessment.isPending ? "Saving" : "Save details"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditAssessmentDetailsDialog({
  open,
  onOpenChange,
  ...formProps
}: EditAssessmentDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-5 border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mounted only while open, so the fields start from the saved values each time. */}
        <DetailsForm {...formProps} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
