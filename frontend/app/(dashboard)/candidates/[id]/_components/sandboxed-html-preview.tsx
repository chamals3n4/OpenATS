"use client";

import { cn } from "@/lib/utils";

interface SandboxedHtmlPreviewProps {
  html: string;
  /** Accessible name for the frame, e.g. "Offer letter preview". */
  title: string;
  className?: string;
}

const SCROLLBAR_COLOR = "#94a3b8";

const PAGE_STYLES = [
  "body{margin:0;padding:24px;font:15px/1.65 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a;background:#fff}",
  "img{max-width:100%;height:auto}table{max-width:100%}",
  // Thin, neutral scrollbar (Firefox, then WebKit/Blink).
  `html{scrollbar-width:thin;scrollbar-color:${SCROLLBAR_COLOR} transparent}`,
  "::-webkit-scrollbar{width:8px;height:8px}",
  "::-webkit-scrollbar-track{background:transparent}",
  `::-webkit-scrollbar-thumb{background:${SCROLLBAR_COLOR};border-radius:9999px}`,
].join("");

/**
 * Template HTML (offer letters, emails) merges in candidate-supplied text, so it is
 * shown in a sandboxed iframe (no scripts, no access to this page) rather than
 * injected into the page.
 */
export function SandboxedHtmlPreview({ html, title, className }: SandboxedHtmlPreviewProps) {
  return (
    <iframe
      title={title}
      sandbox=""
      srcDoc={`<!doctype html><meta charset="utf-8"><style>${PAGE_STYLES}</style>${html}`}
      className={cn(
        "h-[420px] w-full rounded-md border border-slate-300 bg-white dark:border-neutral-700",
        className,
      )}
    />
  );
}
