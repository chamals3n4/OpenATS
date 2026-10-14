"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePassword, inputCls } from "../_lib/user-utils";

async function copyToClipboard(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Password copied");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Password copied");
    } catch {
      toast.error("Copy failed");
    }
  }
}

// Password input with show/hide, Generate and Copy
export function PasswordField({
  id,
  value,
  onChange,
  revealOnGenerate = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  revealOnGenerate?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative flex-1 w-full">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter the password"
          className={inputCls + " pr-10"}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          className="h-10 px-4 rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 shadow-none flex-1 sm:flex-none"
          onClick={() => {
            onChange(generatePassword());
            if (revealOnGenerate) setShow(true);
          }}
        >
          Generate
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!value}
          className="h-10 px-3 rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 shadow-none flex-1 sm:flex-none"
          onClick={() => copyToClipboard(value)}
        >
          <Copy className="size-4 mr-2" />
          Copy
        </Button>
      </div>
    </div>
  );
}
