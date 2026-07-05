"use client";

export function JobHeader() {
  return (
    <div className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-4">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Create New Job
        </h1>
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
        Saved as a draft — publish it from the job page when you&apos;re ready.
      </p>
    </div>
  );
}
