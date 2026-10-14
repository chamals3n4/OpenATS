"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BracesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useVariableGroups } from "./variables-context";

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  disabled?: boolean;
  /** Screen reader label: "subject" or "body" */
  target: string;
}

export function VariablePicker({ onSelect, disabled, target }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const groups = useVariableGroups();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            aria-label={`Insert a variable into the ${target}`}
            className="h-8 shrink-0 cursor-pointer gap-1.5 px-2.5 text-[13px] font-medium text-slate-600 dark:text-neutral-300"
          />
        }
      >
        <HugeiconsIcon icon={BracesIcon} className="size-4" strokeWidth={1.75} />
        Variable
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No variables found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.vars.map((v) => (
                  <CommandItem
                    key={v.name}
                    value={v.name}
                    onSelect={() => {
                      onSelect(v.name);
                      setOpen(false);
                    }}
                  >
                    <span className="font-mono text-xs">{`{{${v.name}}}`}</span>
                    <span className="ml-auto max-w-32 truncate text-xs text-slate-500 dark:text-neutral-400">
                      {v.sample}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
