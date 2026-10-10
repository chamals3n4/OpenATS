"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Moon02Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "system", icon: ComputerIcon, label: "System theme" },
  { id: "light", icon: Sun01Icon, label: "Light theme" },
  { id: "dark", icon: Moon02Icon, label: "Dark theme" },
] as const;

/** System / light / dark, as a small segmented control. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  // Theme is client-only, so hold the toggle back until after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn("h-8 w-[88px] shrink-0 rounded-full bg-muted/50", className)}
      />
    );
  }

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-full border border-border bg-muted/60 p-0.5 dark:bg-muted/40",
        className,
      )}
    >
      {MODES.map((mode) => {
        const active = theme === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            title={mode.label}
            aria-label={mode.label}
            aria-pressed={active}
            onClick={() => setTheme(mode.id)}
            className={cn(
              "flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={mode.icon}
              className="size-4"
              strokeWidth={1.75}
            />
          </button>
        );
      })}
    </div>
  );
}
