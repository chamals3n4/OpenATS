"use client";

import { useRef } from "react";
import { VariablePicker } from "./variable-picker";

/** The id of the message shown under the composer when the subject is wrong. */
export const SUBJECT_ERROR_ID = "template-subject-error";

interface EmailSubjectFieldProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  readOnly?: boolean;
}

/** The subject line at the top of the composer. */
export function EmailSubjectField({ value, onChange, invalid = false, readOnly = false }: EmailSubjectFieldProps) {
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
    <div className="flex items-center gap-2 py-1 pl-4 pr-2">
      <label htmlFor="template-subject" className="shrink-0 text-sm font-medium text-slate-500 dark:text-neutral-400">
        Subject
      </label>
      <input
        id="template-subject"
        ref={inputRef}
        placeholder="e.g. Your interview for {{job_title}}"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? SUBJECT_ERROR_ID : undefined}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />
      {!readOnly && <VariablePicker target="subject" onSelect={insertVariable} />}
    </div>
  );
}
