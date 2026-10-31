"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CareersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 dark:bg-neutral-950">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">
          We could not load this page
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          This is a problem on our side, not with the job. Please try again in a moment.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
