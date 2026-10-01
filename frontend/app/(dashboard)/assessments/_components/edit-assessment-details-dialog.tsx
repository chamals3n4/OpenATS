"use client";

import { useId, useState } from "react";
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
  details,
  isPending,
  onCancel,
  onSave,
}: {
  details: AssessmentDetails;
  isPending: boolean;
  onCancel: () => void;
  onSave: (details: AssessmentDetails) => void;
}) {
  const uid = useId();
  const [title, setTitle] = useState(details.title);
  const [description, setDescription] = useState(details.description);
  const [timeLimit, setTimeLimit] = useState(String(details.timeLimit));

  const handleSave = () => {
    const limit = Number(timeLimit);
    if (!title.trim()) return toast.warning("Assessment title is required.");
    if (!Number.isInteger(limit) || limit < 1) {
      return toast.warning("Time limit must be a whole number of minutes.");
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      timeLimit: limit,
    });
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
          <Label
            htmlFor={`${uid}-title`}
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300"
          >
            Assessment title
          </Label>
          <Input
            id={`${uid}-title`}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Frontend Developer Assessment"
            className="h-10 rounded-md border-slate-300 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </div>
        <div>
          <Label
            htmlFor={`${uid}-description`}
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300"
          >
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <Textarea
            id={`${uid}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should this assessment evaluate?"
            rows={3}
            className="resize-y border-slate-300 bg-gray-100 shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </div>
        <div className="w-44">
          <Label
            htmlFor={`${uid}-time-limit`}
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300"
          >
            Time limit (minutes)
          </Label>
          <Input
            id={`${uid}-time-limit`}
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
          onClick={onCancel}
          disabled={isPending}
          className="h-9"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="h-9 gap-2 bg-theme text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? "Saving" : "Save details"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditAssessmentDetailsDialog({
  assessmentId,
  open,
  onOpenChange,
  details,
  onSaved,
}: EditAssessmentDetailsDialogProps) {
  // The mutation lives here, not in the form: this component stays mounted, so
  // the completion callbacks still run even if the form were unmounted.
  const updateAssessment = useUpdateAssessment(assessmentId);

  const handleSave = (next: AssessmentDetails) => {
    updateAssessment.mutate(
      { ...next, description: next.description || null },
      {
        onSuccess: () => {
          toast.success("Assessment details updated");
          onSaved(next);
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(error.message || "Failed to update assessment"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Ignore close requests (X button, Escape, outside click) mid-save.
        if (!nextOpen && updateAssessment.isPending) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md gap-5 border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mounted only while open, so the fields start from the saved values each time. */}
        <DetailsForm
          details={details}
          isPending={updateAssessment.isPending}
          onCancel={() => onOpenChange(false)}
          onSave={handleSave}
        />
      </DialogContent>
    </Dialog>
  );
}
