"use client";

import { useState } from "react";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import type { PipelineStage } from "@/types";

export type StageType = PipelineStage["stageType"];

export interface StageValues {
  name: string;
  stageType: StageType;
}

const NAME_MAX = 100;

export const STAGE_TYPES: { value: StageType; label: string; description: string; dot: string }[] = [
  { value: "screening", label: "Screening", description: "Reviewing applications and early checks", dot: "bg-amber-500" },
  { value: "interview", label: "Interview", description: "Meeting and assessing the candidate", dot: "bg-blue-500" },
  { value: "offer", label: "Offer", description: "Making and agreeing the offer", dot: "bg-green-500" },
];

interface StageDialogProps {
  open: boolean;
  /** The stage being changed, or null when adding a new one. */
  stage: PipelineStage | null;
  isPending: boolean;
  onSubmit: (values: StageValues) => void;
  onClose: () => void;
}

function StageForm({ stage, isPending, onSubmit, onClose }: Omit<StageDialogProps, "open">) {
  const [name, setName] = useState(stage?.name ?? "");
  const [stageType, setStageType] = useState<StageType>(stage?.stageType ?? "screening");
  const [showErrors, setShowErrors] = useState(false);

  const trimmed = name.trim();
  const nameError = !trimmed
    ? "Enter a name for the stage."
    : trimmed.length > NAME_MAX
      ? `Keep the name under ${NAME_MAX} characters.`
      : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setShowErrors(true);
        if (nameError || isPending) return;
        onSubmit({ name: trimmed, stageType });
      }}
    >
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          {stage ? "Edit stage" : "Add a stage"}
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
          {stage
            ? "Candidates already in this stage stay in it."
            : "The new stage goes at the end of the pipeline. You can drag it into place afterwards."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 px-6 py-5">
        <FormField label="Stage name" htmlFor="stage-name" required error={showErrors ? nameError : null}>
          <Input
            id="stage-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Technical interview"
            className={inputCls}
          />
        </FormField>

        <div className="space-y-2">
          <p id="stage-type-label" className="text-sm font-medium text-slate-800 dark:text-neutral-200">
            Type
          </p>
          <RadioGroup
            aria-labelledby="stage-type-label"
            value={stageType}
            onValueChange={(value) => setStageType(value as StageType)}
            className="gap-2"
          >
            {STAGE_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 transition-[border-color,background-color] duration-200 ease-out hover:border-slate-400 has-data-checked:border-theme has-data-checked:bg-theme/5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-theme motion-reduce:transition-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:has-data-checked:bg-theme/10"
              >
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${type.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-neutral-100">{type.label}</span>
                  <span className="block text-[13px] text-slate-600 dark:text-neutral-400">{type.description}</span>
                </span>
                <RadioGroupItem variant="theme" value={type.value} aria-label={type.label} className="shrink-0" />
              </label>
            ))}
          </RadioGroup>
          <p className="text-[13px] text-slate-500 dark:text-neutral-400">The type sets the colour of the stage.</p>
        </div>
      </div>

      <DialogFooter className="border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button type="button" variant="cancel" onClick={onClose} disabled={isPending} className="h-9 px-4 text-sm">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isPending && <Spinner className="size-3.5" />}
          {isPending ? "Saving" : stage ? "Save changes" : "Add stage"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Adds a stage, or changes the name and type of one. */
export function StageDialog({ open, stage, isPending, onSubmit, onClose }: StageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[480px] dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mount only when open so the form resets */}
        {open && <StageForm stage={stage} isPending={isPending} onSubmit={onSubmit} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
