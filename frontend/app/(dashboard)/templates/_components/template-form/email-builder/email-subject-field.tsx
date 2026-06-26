"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface EmailSubjectFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function EmailSubjectField({ value, onChange, readOnly = false }: EmailSubjectFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Email Subject</Label>
      <Input
        placeholder="e.g. Interview Invitation — {{job_title}}"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={INPUT_CLASS}
      />
    </div>
  );
}
