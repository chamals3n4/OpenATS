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
    <div className="w-40">
      <Label htmlFor={id} className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1.5 block">
        Points
      </Label>
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
        className={inputCls}
      />
      <p className="mt-1 text-xs text-slate-400 dark:text-neutral-500">
        {written
          ? "A reviewer awards up to this many."
          : multiSelect
            ? "Partial credit for each correct pick."
            : "Awarded for the correct answer."}
      </p>
    </div>
  );
}
