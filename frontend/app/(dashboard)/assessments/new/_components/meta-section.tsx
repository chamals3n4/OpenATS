"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputCls, textareaCls } from "../lib/assessment-builder-constants";

interface AssessmentMetaSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  timeLimit: string;
  onTimeLimitChange: (value: string) => void;
  totalPoints: string;
  onTotalPointsChange: (value: string) => void;
}

export function AssessmentMetaSection({
  isOpen,
  onToggle,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  timeLimit,
  onTimeLimitChange,
  totalPoints,
  onTotalPointsChange,
}: AssessmentMetaSectionProps) {
  return (
    <div className="border-b border-slate-100 dark:border-neutral-800 shrink-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-8 py-4 hover:bg-slate-50/60 dark:hover:bg-neutral-900 transition-colors group"
      >
        <span className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 tracking-widest uppercase">
          Assessment Details
        </span>
        <HugeiconsIcon
          icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon}
          className="size-4 text-slate-400 group-hover:text-slate-600 transition-colors"
          strokeWidth={2}
        />
      </button>

      {isOpen && (
        <div className="px-8 pb-8 space-y-5">
          <div>
            <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
              Assessment Title
            </Label>
            <Input
              placeholder="e.g., Frontend Developer Assessment"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
              Description
            </Label>
            <textarea
              placeholder="Describe what this assessment is for ..."
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className={textareaCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                Time Limit (Minutes)
              </Label>
              <Input
                value={timeLimit}
                onChange={(e) => onTimeLimitChange(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                Total Points
              </Label>
              <Input
                value={totalPoints}
                onChange={(e) => onTotalPointsChange(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
