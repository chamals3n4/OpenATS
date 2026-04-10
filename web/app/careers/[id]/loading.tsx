export default function JobApplicationLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-[800px] mx-auto pt-16 pb-24 px-6 sm:px-8 animate-pulse">
        {/* Back link */}
        <div className="h-4 w-24 bg-slate-200 dark:bg-neutral-800 rounded mb-10" />

        {/* Title + Apply button row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-6">
          <div className="h-9 w-72 bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-10 w-24 bg-slate-200 dark:bg-neutral-800 rounded-[6px] shrink-0" />
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-12">
          <div className="h-4 w-24 bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-4 w-28 bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-neutral-800 rounded" />
        </div>

        {/* Description block */}
        <div className="space-y-2.5">
          <div className="h-3.5 w-full bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-3.5 w-[95%] bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-3.5 w-[90%] bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-3.5 w-[85%] bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-3.5 w-[92%] bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-3.5 w-[78%] bg-slate-200 dark:bg-neutral-800 rounded" />
        </div>

        <div className="my-14 border-t border-slate-100 dark:border-neutral-800" />

        {/* "Apply for this job" heading */}
        <div className="h-7 w-48 bg-slate-200 dark:bg-neutral-800 rounded mb-8" />

        {/* Name fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-neutral-800 rounded" />
            <div className="h-11 w-full bg-slate-100 dark:bg-neutral-800 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-neutral-800 rounded" />
            <div className="h-11 w-full bg-slate-100 dark:bg-neutral-800 rounded-md" />
          </div>
        </div>

        {/* Email field */}
        <div className="space-y-2 mb-6">
          <div className="h-3.5 w-12 bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-11 w-full bg-slate-100 dark:bg-neutral-800 rounded-md" />
        </div>

        {/* Phone field */}
        <div className="space-y-2 mb-6">
          <div className="h-3.5 w-14 bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="flex gap-3">
            <div className="h-11 w-[100px] bg-slate-100 dark:bg-neutral-800 rounded-md" />
            <div className="h-11 flex-1 bg-slate-100 dark:bg-neutral-800 rounded-md" />
          </div>
        </div>

        {/* Resume upload zone */}
        <div className="space-y-2 mb-6">
          <div className="h-3.5 w-24 bg-slate-200 dark:bg-neutral-800 rounded" />
          <div className="h-[120px] w-full bg-slate-100 dark:bg-neutral-800 rounded-xl border border-dashed border-slate-200 dark:border-neutral-700" />
        </div>

        {/* Submit button */}
        <div className="pt-4">
          <div className="h-12 w-44 bg-slate-200 dark:bg-neutral-800 rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}
