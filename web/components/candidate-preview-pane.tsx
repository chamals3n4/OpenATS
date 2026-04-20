"use client";

import type { ReactNode } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { OFFER_STATUS_STYLES } from "@/lib/offer-status-styles";
import { ResumeScrollView } from "@/components/resume-scroll-view";
import { useCandidate } from "@/hooks/use-api";
import { useCandidateDetailSheet } from "@/components/candidate-detail-sheet-context";

/**
 * Plain-text body preview — mirrors server `plainTextToComposedEmailHtml` (no automated footer).
 */
function buildPlainTextClientHtml(body: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const paragraphs = blocks
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1e293b">${esc(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
  return `<div style="font-family:sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:32px 24px">${paragraphs}</div>`;
}

/** Isolated document so parent dark theme / Tailwind does not flatten email HTML. */
function emailDraftPreviewSrcDoc(innerHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><base target="_blank" rel="noopener noreferrer"/><style>
html,body{margin:0;padding:0;background:#fff;color:#0f172a;}
body{padding:12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.5;}
a{color:#2563eb;}
</style></head><body>${innerHtml}</body></html>`;
}

/** Same chrome as the Send Email preview: To bar, Subject, body region. */
function MessagePreviewCard(props: {
  toEmail: string;
  subjectLine: string;
  subjectEmptyHint: ReactNode;
  body: ReactNode;
}) {
  const { toEmail, subjectLine, subjectEmptyHint, body } = props;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-900/80">
        <p className="text-[11px] text-slate-500 dark:text-neutral-500">
          <span className="font-semibold text-slate-600 dark:text-neutral-400">
            To
          </span>{" "}
          <span className="text-[12px] text-slate-800 dark:text-neutral-200 break-all">
            {toEmail}
          </span>
        </p>
      </div>
      <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-500 uppercase tracking-wide mb-1">
          Subject
        </p>
        {subjectLine.trim() ? (
          <p className="text-[13px] text-slate-800 dark:text-neutral-200 leading-snug">
            {subjectLine}
          </p>
        ) : (
          <p className="text-[13px] text-slate-500 dark:text-neutral-400 leading-snug">
            {subjectEmptyHint}
          </p>
        )}
      </div>
      <div className="px-3 py-3 text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed min-h-[120px]">
        {body}
      </div>
    </div>
  );
}


interface CandidatePreviewPaneProps {
  candidateId: number;
  open?: boolean;
}

/**
 * Left-column preview: same viewport as the CV — Resume, Offer letter HTML, or Email draft.
 * Pairs with {@link CandidateSidePanel} via {@link CandidateDetailSheetProvider}.
 */
export function CandidatePreviewPane({
  candidateId,
  open = true,
}: CandidatePreviewPaneProps) {
  const { data, isLoading } = useCandidate(candidateId, {
    enabled: open && !!candidateId,
  });
  const candidate = data?.data;
  const {
    previewPane,
    setPreviewPane,
    emailPreviewSubject,
    emailPreviewPlainBody,
    emailHtml,
    offerPreviewHtml,
    offerPreviewSubject,
  } = useCandidateDetailSheet();

  const offer = candidate?.offer;
  const offerSavedHtml = offer?.renderedHtml?.trim() ?? "";
  const offerLiveHtml = offerPreviewHtml?.trim() ?? "";
  const offerDisplayHtml = offerLiveHtml || offerSavedHtml;
  const offerDefaultSubject = candidate?.jobTitle?.trim()
    ? `Offer — ${candidate.jobTitle.trim()}`
    : "Offer of employment";
  const offerDisplaySubject =
    offerPreviewSubject?.trim() || offerDefaultSubject;
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;

  const hasResume = !!candidate?.resumeUrl;
  const hasOffer = !!offer;

  /** Avoid stuck "offer" pane when there is no offer (e.g. visited Offer tab before sync fix). */
  const previewPaneResolved: typeof previewPane =
    previewPane === "offer" && !hasOffer
      ? hasResume
        ? "resume"
        : "email"
      : previewPane;

  const showResumePane = previewPaneResolved === "resume" && hasResume;
  const showOfferPane = previewPaneResolved === "offer" && hasOffer;
  const showEmailPane = previewPaneResolved === "email";

  const previewRootId = `candidate-preview-pane-${candidateId}`;

  if (isLoading || !candidate) {
    return (
      <div
        id={previewRootId}
        className="flex-1 flex items-center justify-center min-h-[200px] bg-white dark:bg-neutral-950"
      >
        <p className="text-slate-400 dark:text-neutral-500 text-sm">Loading preview…</p>
      </div>
    );
  }

  return (
    <div
      id={previewRootId}
      className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white dark:bg-neutral-950"
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-neutral-800 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 dark:border-neutral-700 p-0.5 bg-slate-100/70 dark:bg-neutral-900/80 shrink-0 flex-wrap gap-0.5">
          {hasResume && (
            <button
              type="button"
              onClick={() => setPreviewPane("resume")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors",
                previewPaneResolved === "resume"
                  ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm"
                  : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200",
              )}
            >
              Resume
            </button>
          )}
          {hasOffer && (
            <button
              type="button"
              onClick={() => setPreviewPane("offer")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors inline-flex items-center gap-1.5",
                previewPaneResolved === "offer"
                  ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm"
                  : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200",
              )}
            >
              Offer letter
              {offer && (
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                    offerStyle?.bg,
                    offerStyle?.text,
                  )}
                >
                  {offer.status}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPreviewPane("email")}
            className={cn(
              "px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors",
              previewPaneResolved === "email"
                ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm"
                : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200",
            )}
          >
            Email
          </button>
        </div>
        {hasResume && (
          <a
            href={`/api/candidates/${candidateId}/resume`}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-medium",
              "border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
              "text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors",
            )}
          >
            <span>Open CV</span>
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              className="size-3"
              strokeWidth={2.5}
            />
          </a>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar-panel">
        {showResumePane && hasResume ? (
          <div className="h-full min-h-[180px] px-1 py-2">
            <ResumeScrollView
              candidateId={candidateId}
              resumeUrl={candidate.resumeUrl}
            />
          </div>
        ) : showOfferPane && offer ? (
          <div className="px-4 py-3">
            {offerDisplayHtml ? (
              <MessagePreviewCard
                toEmail={candidate.email ?? ""}
                subjectLine={offerDisplaySubject}
                subjectEmptyHint={<>—</>}
                body={
                  <iframe
                    key={
                      offerLiveHtml
                        ? `live-${offerLiveHtml.length}-${offerLiveHtml.slice(0, 64)}`
                        : `${offer.id}-${offer.updatedAt}`
                    }
                    title="Offer letter preview"
                    sandbox=""
                    className="w-full min-h-[280px] h-[min(52vh,520px)] border-0 rounded-md block bg-white"
                    srcDoc={emailDraftPreviewSrcDoc(offerDisplayHtml)}
                  />
                }
              />
            ) : (
              <MessagePreviewCard
                toEmail={candidate.email ?? ""}
                subjectLine={
                  candidate.jobTitle?.trim()
                    ? `Offer — ${candidate.jobTitle.trim()}`
                    : ""
                }
                subjectEmptyHint={<>Choose a template on the Offer tab.</>}
                body={
                  <p className="text-[13px] text-slate-500 dark:text-neutral-400">
                    Select a template on Offer to preview the letter.
                  </p>
                }
              />
            )}
          </div>
        ) : showEmailPane ? (
          <div className="px-4 py-3">
            <MessagePreviewCard
              toEmail={candidate.email ?? ""}
              subjectLine={emailPreviewSubject}
              subjectEmptyHint={<>No subject</>}
              body={
                emailHtml?.trim() ? (
                  <iframe
                    key={emailHtml.trim()}
                    title="Email preview"
                    sandbox=""
                    className="w-full min-h-[280px] h-[min(52vh,520px)] border-0 rounded-md block bg-white"
                    srcDoc={emailDraftPreviewSrcDoc(emailHtml.trim())}
                  />
                ) : emailPreviewPlainBody.trim() ? (
                  <iframe
                    key={emailPreviewPlainBody}
                    title="Email preview"
                    sandbox=""
                    className="w-full min-h-[280px] h-[min(52vh,520px)] border-0 rounded-md block bg-white"
                    srcDoc={emailDraftPreviewSrcDoc(
                      buildPlainTextClientHtml(emailPreviewPlainBody),
                    )}
                  />
                ) : (
                  <span className="text-slate-500 dark:text-neutral-400">
                    Nothing to preview yet.
                  </span>
                )
              }
            />
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] text-slate-500 dark:text-neutral-400">
              {previewPaneResolved === "resume" && !hasResume ? (
                <>No resume on file.</>
              ) : (
                <>Pick Resume, Offer letter, or Email above.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
