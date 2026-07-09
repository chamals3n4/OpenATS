"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Link01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface MeetingUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoGenerateMeet: boolean;
  onAutoGenerateMeetChange: (value: boolean) => void;
  readOnly?: boolean;
}

export function MeetingUrlField({
  value,
  onChange,
  autoGenerateMeet,
  onAutoGenerateMeetChange,
  readOnly = false,
}: MeetingUrlFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Meeting Link</Label>
      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors border-slate-200 dark:border-neutral-700 has-[:checked]:border-[var(--theme-color)] has-[:checked]:bg-(--theme-color)/5">
          <input
            type="radio"
            checked={autoGenerateMeet}
            disabled={readOnly}
            onChange={() => onAutoGenerateMeetChange(true)}
            className="text-[var(--theme-color)]"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Auto-generate Google Meet
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 transition-colors border-slate-200 dark:border-neutral-700 has-[:checked]:border-[var(--theme-color)] has-[:checked]:bg-(--theme-color)/5">
          <input
            type="radio"
            checked={!autoGenerateMeet}
            disabled={readOnly}
            onChange={() => onAutoGenerateMeetChange(false)}
            className="text-[var(--theme-color)]"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Paste a link
          </span>
        </label>
      </div>
      {!autoGenerateMeet && (
        <div className="relative">
          <HugeiconsIcon
            icon={Link01Icon}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Zoom / Teams / Meet link"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly}
            className={`${INPUT_CLASS} pl-8`}
          />
        </div>
      )}
      {autoGenerateMeet && (
        <p className="text-xs text-slate-400 dark:text-neutral-500">
          The link is generated from the assigned interviewer&apos;s connected
          Google account when the interview is scheduled.
        </p>
      )}
    </div>
  );
}
