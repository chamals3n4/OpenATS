import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Tick02Icon } from "@hugeicons/core-free-icons";

const TONES = {
  success: "bg-theme/10 text-theme dark:text-primary",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  error: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
} as const;

/** Full screen message */
export function MessageScreen({
  icon,
  tone,
  title,
  children,
}: {
  icon: typeof Tick02Icon;
  tone: keyof typeof TONES;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-6 py-12 dark:bg-neutral-950">
      <div className="w-full max-w-md text-center">
        <span className={`mx-auto flex size-12 items-center justify-center rounded-full ${TONES[tone]}`}>
          <HugeiconsIcon icon={icon} className="size-6" strokeWidth={2} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-neutral-100">{title}</h1>
        <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">{children}</div>
      </div>
    </main>
  );
}
