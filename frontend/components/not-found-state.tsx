import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NotFoundStateProps {
  title: string;
  description: string;
  /** Buttons under the text */
  children: ReactNode;
  /** Fills the screen, for pages outside the dashboard */
  fullPage?: boolean;
}

/** The large 404 used across the app */
export function NotFoundState({ title, description, children, fullPage = false }: NotFoundStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-white px-6 py-16 dark:bg-neutral-950",
        fullPage ? "min-h-screen" : "min-h-[calc(100dvh-var(--header-height))] flex-1",
      )}
    >
      <div className="w-full max-w-xl text-center">
        <p
          aria-hidden
          className="text-[112px] font-semibold leading-none tracking-tight text-slate-200 sm:text-[148px] dark:text-neutral-800"
        >
          404
        </p>
        <h1 className="mt-6 text-3xl font-semibold leading-tight text-slate-900 sm:text-[32px] dark:text-neutral-100">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-neutral-400">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}
