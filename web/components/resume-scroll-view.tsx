"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

type ResumeScrollViewProps = {
  candidateId: number;
  /** Optional legacy direct URL — only used if the same-origin proxy fails to load. */
  resumeUrl?: string | null;
};

/**
 * Renders the resume with pdf.js so scrolling uses the page’s thin-scrollbar-panel
 * (the browser PDF iframe uses a wide OS scrollbar we cannot style).
 * PDF is loaded from `/api/candidates/:id/resume` (authenticated proxy), not the private R2 URL.
 */
export function ResumeScrollView({
  candidateId,
  resumeUrl: resumeUrlFallback,
}: ResumeScrollViewProps) {
  const proxyUrl = `/api/candidates/${candidateId}/resume`;
  const [pdfSrc, setPdfSrc] = useState(proxyUrl);
  const [numPages, setNumPages] = useState(0);
  const [useIframe, setUseIframe] = useState(false);

  useEffect(() => {
    setPdfSrc(`/api/candidates/${candidateId}/resume`);
    setUseIframe(false);
    setNumPages(0);
  }, [candidateId]);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setPageWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP));
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP));
        } else if (e.key === "0") {
          e.preventDefault();
          setScale(1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(ZOOM_MAX, s + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(ZOOM_MIN, s - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => setScale(1), []);

  if (useIframe) {
    return (
      <div className="flex flex-col flex-1 min-h-0 w-full">
        <p className="shrink-0 px-2 py-1.5 text-center text-[11px] text-slate-500 dark:text-neutral-500 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          Embedded viewer — use browser PDF controls to zoom, or open “View CV” for a new tab.
        </p>
        <iframe
          src={`${pdfSrc}#toolbar=0&navpanes=0&scrollbar=0`}
          title="Resume"
          className="min-h-0 flex-1 w-full border-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        />
      </div>
    );
  }

  const pct = Math.round(scale * 100);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="shrink-0 flex items-center justify-center gap-1.5 border-b border-slate-200/80 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 px-2 py-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 border-slate-200 dark:border-neutral-800"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={scale <= ZOOM_MIN}
          onClick={zoomOut}
        >
          <ZoomOut className="size-3.5" strokeWidth={2} />
        </Button>
        <span
          className="min-w-[3.25rem] text-center text-[12px] font-medium tabular-nums text-slate-700 dark:text-neutral-300"
          title="Zoom level"
        >
          {pct}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 border-slate-200 dark:border-neutral-800"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={scale >= ZOOM_MAX}
          onClick={zoomIn}
        >
          <ZoomIn className="size-3.5" strokeWidth={2} />
        </Button>
        <div className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-neutral-700" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[11px] font-medium text-slate-600 dark:text-neutral-400"
          title="Reset zoom (100%) — Ctrl+0"
          onClick={resetZoom}
        >
          Reset
        </Button>
        <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-neutral-500 ml-0.5">
          Ctrl±
        </span>
      </div>

      <div
        ref={containerRef}
        className="thin-scrollbar-panel flex-1 min-h-0 w-full overflow-y-auto bg-slate-100 dark:bg-neutral-900"
      >
        <div className="flex flex-col items-center pt-0 pb-2 px-1 min-h-full">
          <Document
            file={pdfSrc}
            onLoadSuccess={onLoadSuccess}
            onLoadError={() => {
              if (resumeUrlFallback && pdfSrc === proxyUrl) {
                setPdfSrc(resumeUrlFallback);
                return;
              }
              setUseIframe(true);
            }}
            loading={
              <p className="py-8 text-[13px] font-normal text-slate-500 dark:text-neutral-500">
                Loading resume…
              </p>
            }
          >
            {numPages > 0 &&
              Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={pageWidth}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mb-2 shadow-sm border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                />
              ))}
          </Document>
        </div>
      </div>
    </div>
  );
}
