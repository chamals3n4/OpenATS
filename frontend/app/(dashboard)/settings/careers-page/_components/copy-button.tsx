"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  /** What is being copied, for the screen reader and the error message. */
  label: string;
  /** Show the word "Copy" next to the icon. */
  withText?: boolean;
}

/** Copies to the clipboard and says so in the button itself for two seconds. */
export function CopyButton({ text, label, withText = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Could not copy the ${label}`);
    }
  };

  return (
    <Button
      type="button"
      variant="cancel"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy the ${label}`}
      className="h-9 shrink-0 gap-2 px-3 text-sm"
    >
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} className="size-4" strokeWidth={2} />
      {withText && (copied ? "Copied" : "Copy")}
    </Button>
  );
}
