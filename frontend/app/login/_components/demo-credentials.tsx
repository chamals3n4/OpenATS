"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

// Public demo only. A self-hosted install leaves the flag unset and shows nothing.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-theme"
      >
        {value}
        <HugeiconsIcon
          icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
          className={`size-4.5 ${copied ? "text-theme" : "text-muted-foreground"}`}
          strokeWidth={2}
        />
      </button>
    </div>
  );
}

export function DemoCredentials() {
  if (!DEMO_MODE || !DEMO_EMAIL || !DEMO_PASSWORD) return null;

  return (
    <div className="fixed top-6 right-6 hidden w-96 rounded-xl border border-theme/30 bg-theme/5 p-6 lg:block">
      <p className="mb-3 text-[15px] font-semibold tracking-wider text-theme">
        Demo credentials
      </p>
      <div className="flex flex-col gap-2">
        <CredentialRow label="Email" value={DEMO_EMAIL} />
        <CredentialRow label="Password" value={DEMO_PASSWORD} />
      </div>
    </div>
  );
}
