"use client";

import { useEffect, useRef, useState } from "react";
import { useSystemEmailPreview } from "@/hooks/queries/use-templates";
import { PreviewPane } from "./template-form/preview-pane";

/** Debounce before fetching a new preview */
const TYPING_PAUSE_MS = 350;

function usePaused<T>(value: T, delayMs: number): T {
  const [paused, setPaused] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setPaused(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return paused;
}

/** Preview of the automatic email. Server builds the HTML, shown in a sandboxed frame */
export function AutomaticEmailPreview({
  purpose,
  subject,
  bodyHtml,
}: {
  purpose: string;
  subject: string;
  bodyHtml: string;
}) {
  // Pause the strings, since a new object each render would restart the timer forever
  const pausedSubject = usePaused(subject, TYPING_PAUSE_MS);
  const pausedBody = usePaused(bodyHtml, TYPING_PAUSE_MS);
  const { data, isError } = useSystemEmailPreview(purpose, {
    subject: pausedSubject,
    bodyHtml: pausedBody,
  });
  const email = data?.data;

  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(520);
  // Resize the frame to fit the email
  const fitToContent = () => {
    // Measure the body so the frame can shrink
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
          // Same origin to read the height, no scripts
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
