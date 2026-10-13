"use client";

import { useEffect, useRef, useState } from "react";
import { useSystemEmailPreview } from "@/hooks/queries/use-templates";
import { PreviewPane } from "./template-form/preview-pane";

/** How long to wait after the last keystroke before asking for a new preview. */
const TYPING_PAUSE_MS = 350;

function usePaused<T>(value: T, delayMs: number): T {
  const [paused, setPaused] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setPaused(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return paused;
}

/**
 * The automatic email as the candidate will receive it: the coloured band, the heading, the
 * details and the button, with made-up values for the name, the job and the dates.
 *
 * The HTML comes from the server, which builds it the same way it builds the email it sends, so
 * what is shown here is the email itself. It goes in a frame that cannot run scripts, because an
 * email is somebody's typed HTML and has no business in this page.
 */
export function AutomaticEmailPreview({
  purpose,
  subject,
  bodyHtml,
}: {
  purpose: string;
  subject: string;
  bodyHtml: string;
}) {
  const content = usePaused({ subject, bodyHtml }, TYPING_PAUSE_MS);
  const { data, isError } = useSystemEmailPreview(purpose, content);
  const email = data?.data;

  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(520);
  // An email has no fixed height, so the frame is made as tall as what it holds.
  const fitToContent = () => {
    // The body, not the document: the document is never shorter than the frame, so measuring it
    // would let the frame grow for a long email and never shrink back for a short one.
    const body = frame.current?.contentDocument?.body;
    if (body) setHeight(body.scrollHeight);
  };

  return (
    <PreviewPane note="This is the email as it will arrive. The name, job, dates and links are examples; each candidate gets their own.">
      <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p
          className={`text-base font-semibold leading-snug ${
            email?.subject ? "text-slate-900 dark:text-neutral-100" : "text-slate-400 dark:text-neutral-500"
          }`}
        >
          {email?.subject || "No subject yet"}
        </p>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-neutral-400">To: Alex Johnson</p>
      </div>

      {isError && !email ? (
        <p role="alert" className="px-5 py-10 text-center text-sm text-slate-500 dark:text-neutral-400">
          The preview could not be loaded. Your changes are not affected.
        </p>
      ) : email ? (
        <iframe
          ref={frame}
          title="Email preview"
          // Same origin so its height can be read; no "allow-scripts", so nothing in it can run.
          sandbox="allow-same-origin"
          srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0}a{pointer-events:none}</style>${email.html}`}
          onLoad={fitToContent}
          style={{ height }}
          className="block w-full border-0 bg-[#f3f4f6]"
        />
      ) : (
        <div className="h-[520px] animate-pulse bg-slate-100 dark:bg-neutral-800" aria-label="Loading the preview" />
      )}
    </PreviewPane>
  );
}
