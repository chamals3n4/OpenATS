"use client";

import { KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui/label";

interface SkillsInputProps {
  skills: string[];
  skillInput: string;
  onSkillInputChange: (value: string) => void;
  onAddSkill: (e: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveSkill: (skill: string) => void;
}

export function SkillsInput({
  skills,
  skillInput,
  onSkillInputChange,
  onAddSkill,
  onRemoveSkill,
}: SkillsInputProps) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
        Skills
      </Label>
      <div className="min-h-10 p-1.5 flex flex-wrap gap-2 border border-slate-300 dark:border-neutral-600 rounded-lg bg-gray-100 dark:bg-neutral-800 transition-[border-color] duration-200">
        {skills.map((skill) => (
          <div
            key={skill}
            className="inline-flex items-center bg-[#F1F5F9] dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-medium px-2.5 py-1 gap-2 rounded-md transition-all hover:bg-slate-200 dark:hover:bg-neutral-700"
          >
            <span className="text-[13px] leading-none">{skill}</span>
            <button
              type="button"
              onClick={() => onRemoveSkill(skill)}
              className="flex items-center justify-center size-4.5 -mr-1 rounded-md text-slate-400 dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-300/50 dark:hover:bg-neutral-700/50 transition-all"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={skillInput}
          onChange={(e) => onSkillInputChange(e.target.value)}
          onKeyDown={onAddSkill}
          placeholder={skills.length === 0 ? "Type and press enter..." : ""}
          className="flex-1 min-w-30 bg-transparent border-none outline-none text-sm px-1 placeholder:text-slate-300 dark:placeholder:text-neutral-600 text-slate-900 dark:text-neutral-100"
        />
      </div>
    </div>
  );
}
