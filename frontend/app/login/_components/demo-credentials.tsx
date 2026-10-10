"use client";

import { Button } from "@/components/ui/button";

// Public demo only. A self-hosted install leaves the flag unset and shows nothing.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export function DemoCredentials({
  onUse,
}: {
  /** Fills the sign-in form with the demo account. */
  onUse: (email: string, password: string) => void;
}) {
  if (!DEMO_MODE || !DEMO_EMAIL || !DEMO_PASSWORD) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Demo credentials
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Email</dt>
              <dd className="truncate font-medium text-foreground">
                {DEMO_EMAIL}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Password</dt>
              <dd className="truncate font-medium text-foreground">
                {DEMO_PASSWORD}
              </dd>
            </div>
          </dl>
        </div>
        <Button
          type="button"
          variant="cancel"
          size="sm"
          onClick={() => onUse(DEMO_EMAIL, DEMO_PASSWORD)}
        >
          Fill in
        </Button>
      </div>
    </div>
  );
}
