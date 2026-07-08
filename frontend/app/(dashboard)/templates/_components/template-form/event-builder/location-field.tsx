"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface LocationFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function LocationField({ value, onChange, readOnly = false }: LocationFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Location</Label>
      <div className="relative">
        <HugeiconsIcon
          icon={Location01Icon}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 dark:text-neutral-500"
        />
        <Input
          placeholder="Office address or building / floor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={`${INPUT_CLASS} pl-8`}
        />
      </div>
    </div>
  );
}
