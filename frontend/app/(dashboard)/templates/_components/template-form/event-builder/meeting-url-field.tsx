"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";

interface MeetingUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function MeetingUrlField({ value, onChange }: MeetingUrlFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={LABEL_CLASS}>Meeting URL</Label>
      <Input
        placeholder="Zoom / Teams / Meet link"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
    </div>
  );
}
