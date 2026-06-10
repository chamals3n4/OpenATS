"use client";

import { textareaCls } from "../lib/assessment-builder-constants";

interface ShortAnswerEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ShortAnswerEditor({ value, onChange }: ShortAnswerEditorProps) {
  return (
    <div className="border border-slate-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
      <h3 className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
        Correct Answer (Key)
      </h3>
      <p className="text-[12px] text-slate-400 dark:text-neutral-500">
        Candidates' answers will be compared against this key for grading.
      </p>
      <textarea
        placeholder="Type the correct answer here ..."
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={textareaCls}
      />
    </div>
  );
}
