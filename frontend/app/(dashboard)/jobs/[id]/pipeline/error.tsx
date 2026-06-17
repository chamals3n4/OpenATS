"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PipelineError({
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
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <h2 className="text-lg font-semibold">Failed to load pipeline</h2>
      <p className="text-sm text-muted-foreground max-w-sm text-center">
        Something went wrong loading the pipeline. Try again or go back.
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
