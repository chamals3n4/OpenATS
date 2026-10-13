"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputCls } from "../lib/assessment-builder-constants";
import { MAX_POINTS, MIN_POINTS, clampPoints } from "../lib/assessment-builder-utils";

interface PointsFieldProps {
  id: string;
  value: number;
  onChange: (points: number) => void;
  disabled?: boolean;
  /** Written answers are graded by a person, so the hint says so. */
  written: boolean;
  multiSelect?: boolean;
}

/** What a fully correct answer to the question is worth. */
export function PointsField({ id, value, onChange, disabled, written, multiSelect }: PointsFieldProps) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700 dark:text-neutral-300">
        Points
      </Label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={MIN_POINTS}
          max={MAX_POINTS}
          step={0.5}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={() => onChange(clampPoints(value))}
          aria-describedby={`${id}-hint`}
          className={`${inputCls} h-10 w-24`}
        />
        <p id={`${id}-hint`} className="text-sm text-slate-600 dark:text-neutral-400">
          {written
            ? "A reviewer awards up to this many."
            : multiSelect
              ? "Shared between the correct answers, with partial credit."
              : "Awarded for the correct answer."}
        </p>
      </div>
    </div>
  );
}
