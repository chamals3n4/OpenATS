"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../lib/template-form-constants";

interface TemplateNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TemplateNameField({
  value,
  onChange,
  placeholder = "e.g. Standard Offer Letter",
  readOnly = false,
}: TemplateNameFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Template Name</Label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={INPUT_CLASS}
      />
    </div>
  );
}
