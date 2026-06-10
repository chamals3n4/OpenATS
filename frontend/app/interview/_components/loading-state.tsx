"use client";

export default function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-neutral-950">
      <div className="size-8 border-[3px] border-slate-200 border-t-[var(--theme-color)] rounded-full animate-spin" />
    </div>
  );
}
