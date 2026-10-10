"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";

// Password field with a show/hide toggle.
export function PasswordInput(
  props: Omit<React.ComponentProps<typeof Input>, "type">,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-9" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon
          icon={visible ? ViewOffSlashIcon : ViewIcon}
          className="size-4"
          strokeWidth={2}
        />
      </button>
    </div>
  );
}
