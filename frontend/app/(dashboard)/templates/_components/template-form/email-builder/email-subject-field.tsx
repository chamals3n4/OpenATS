"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INPUT_CLASS, LABEL_CLASS } from "../../../lib/template-form-constants";
import { VariablePicker } from "./variable-picker";

interface EmailSubjectFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function EmailSubjectField({ value, onChange, readOnly = false }: EmailSubjectFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertVariable = (variable: string) => {
    const input = inputRef.current;
    const placeholder = `{{${variable}}}`;
    if (!input) {
      onChange(`${value}${placeholder}`);
      return;
    }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const next = value.slice(0, start) + placeholder + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + placeholder.length;
      input.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-1.5">
      <Label className={LABEL_CLASS}>Email Subject</Label>
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          placeholder="e.g. Interview Invitation — {{job_title}}"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={INPUT_CLASS + " flex-1"}
        />
        {!readOnly && <VariablePicker onSelect={insertVariable} />}
      </div>
    </div>
  );
}
