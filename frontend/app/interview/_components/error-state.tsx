"use client";

export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-neutral-950">
      <div className="text-center">
        <div className="size-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200">
          {message || "Invalid link"}
        </p>
      </div>
    </div>
  );
}
