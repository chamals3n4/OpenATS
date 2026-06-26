"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface MeetingUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function MeetingUrlField({ value, onChange, readOnly = false }: MeetingUrlFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={LABEL_CLASS}>Meeting URL</Label>
      <Input
        placeholder="Zoom / Teams / Meet link"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={INPUT_CLASS}
      />
    </div>
  );
}
