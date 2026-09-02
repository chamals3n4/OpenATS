"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateAssessment } from "@/hooks/queries/use-assessments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CreateAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAssessmentDialog({ open, onOpenChange }: CreateAssessmentDialogProps) {
  const router = useRouter();
  const createAssessment = useCreateAssessment();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("120");

  const reset = () => {
    setTitle("");
    setDescription("");
    setTimeLimit("120");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (createAssessment.isPending) return;
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  };

  const handleContinue = () => {
    if (!title.trim()) {
      toast.warning("Assessment title is required.");
      return;
    }

    createAssessment.mutate(
      { title: title.trim(), description: description.trim() || null, timeLimit: Number(timeLimit) || 120 },
      {
        onSuccess: ({ data }) => {
          toast.success("Assessment created");
          onOpenChange(false);
          reset();
          router.push(`/assessments/${data.id}`);
        },
        onError: (error) => toast.error(error.message || "Failed to create assessment"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-5 border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">New assessment</DialogTitle>
          <DialogDescription>Add the basics, then continue to build the questions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">Assessment title</Label>
            <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Frontend Developer Assessment" className="h-10 rounded-md border-slate-200 bg-slate-50 shadow-none focus-visible:ring-0 focus-visible:border-theme dark:border-neutral-700 dark:bg-neutral-950" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">Description <span className="font-normal text-slate-400">(optional)</span></Label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should this assessment evaluate?" rows={3} className="w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus:border-theme focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100" />
          </div>
          <div className="w-44">
            <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-neutral-300">Time limit (minutes)</Label>
            <Input type="number" min="1" value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="h-10 rounded-md border-slate-200 bg-slate-50 shadow-none focus-visible:ring-0 focus-visible:border-theme dark:border-neutral-700 dark:bg-neutral-950" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={createAssessment.isPending} className="h-9 border-slate-200 shadow-none dark:border-neutral-700">Cancel</Button>
          <Button onClick={handleContinue} disabled={createAssessment.isPending} className="h-9 gap-2 bg-theme text-white hover:bg-theme-hover">
            {createAssessment.isPending && <Spinner className="size-3.5" />}
            {createAssessment.isPending ? "Saving" : "Save and continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
