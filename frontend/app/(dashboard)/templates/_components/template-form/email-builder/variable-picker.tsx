"use client";

import { useState } from "react";
import { Braces } from "lucide-react";
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
import { VARS, SAMPLE } from "../../../lib/template-form-constants";

interface VariablePickerProps {
  onSelect: (variable: string) => void;
  disabled?: boolean;
}

export function VariablePicker({ onSelect, disabled }: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="size-8 text-slate-500 dark:text-neutral-400"
            title="Insert variable"
          />
        }
      >
        <Braces className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList>
            <CommandEmpty>No variables found.</CommandEmpty>
            <CommandGroup heading="Variables">
              {VARS.map((v) => (
                <CommandItem
                  key={v}
                  value={v}
                  onSelect={() => {
                    onSelect(v);
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-xs">{`{{${v}}}`}</span>
                  <span className="ml-auto text-[10px] text-slate-400 dark:text-neutral-500 truncate max-w-24">
                    {SAMPLE[v]}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
