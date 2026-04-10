"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { ResumeScrollView } from "@/components/resume-scroll-view";
import { useCandidate } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useCandidateDetailSheet } from "@/components/candidate-detail-sheet-context";

const OFFER_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400" },
  sent: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
  pending: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400" },
  accepted: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400" },
  declined: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-500 dark:text-red-400" },
  withdrawn: { bg: "bg-slate-50 dark:bg-neutral-800", text: "text-slate-500 dark:text-neutral-400" },
};

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
    emailSubject,
    emailBody,
  } = useCandidateDetailSheet();

  const offer = candidate?.offer;
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;

  const hasResume = !!candidate?.resumeUrl;
  const hasOffer = !!offer;

  const showResumePane = previewPane === "resume" && hasResume;
  const showOfferPane = previewPane === "offer" && hasOffer;
  const showEmailPane = previewPane === "email";

  if (isLoading || !candidate) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[200px] bg-white dark:bg-neutral-950">
        <p className="text-slate-400 dark:text-neutral-500 text-sm">Loading preview…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white dark:bg-neutral-950">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 dark:border-neutral-800 flex-wrap">
        <div className="flex rounded-lg border border-slate-200 dark:border-neutral-700 p-0.5 bg-slate-100/70 dark:bg-neutral-900/80 shrink-0 flex-wrap gap-0.5">
          {hasResume && (
            <button
              type="button"
              onClick={() => setPreviewPane("resume")}
              className={cn(
                "px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors",
                previewPane === "resume"
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
                previewPane === "offer"
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
              previewPane === "email"
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
            className="shrink-0"
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[11px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none rounded-lg gap-1"
            >
              <span>Open CV</span>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                className="size-3"
                strokeWidth={2.5}
              />
            </Button>
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
            {offer.renderedHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: offer.renderedHtml }}
              />
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                {offer.status === "draft" ? (
                  <>
                    <strong>Draft</strong> — no letter rendered yet. Use the{" "}
                    <strong>Offer</strong> tab, fill details, then{" "}
                    <strong>Save draft &amp; update preview</strong>.
                  </>
                ) : (
                  <>
                    No letter HTML yet. Open <strong>Offer</strong> → <strong>Edit</strong> and save to refresh.
                  </>
                )}
              </p>
            )}
          </div>
        ) : showEmailPane ? (
          <div className="px-4 py-3">
            <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-900/80">
                <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                  <span className="font-semibold text-slate-600 dark:text-neutral-400">
                    To
                  </span>{" "}
                  <span className="text-[12px] text-slate-800 dark:text-neutral-200 break-all">
                    {candidate.email}
                  </span>
                </p>
              </div>
              <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-500 uppercase tracking-wide mb-1">
                  Subject
                </p>
                {emailSubject.trim() ? (
                  <p className="text-[13px] text-slate-800 dark:text-neutral-200 leading-snug">
                    {emailSubject}
                  </p>
                ) : (
                  <p className="text-[13px] text-slate-400 dark:text-neutral-500 italic">
                    No subject yet — add one under <strong>Send Email</strong>.
                  </p>
                )}
              </div>
              <div className="px-3 py-3 text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap min-h-[120px]">
                {emailBody.trim() ? (
                  emailBody
                ) : (
                  <span className="text-slate-400 dark:text-neutral-500 italic">
                    Your message will appear here as you type in{" "}
                    <strong>Send Email</strong>.
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] text-slate-500 dark:text-neutral-400">
              {previewPane === "resume" && !hasResume ? (
                <>No resume on file — switch to <strong>Offer letter</strong> or <strong>Email</strong>.</>
              ) : previewPane === "offer" && !hasOffer ? (
                <>No offer yet — it appears when the candidate reaches an offer stage.</>
              ) : (
                <>Choose <strong>Resume</strong>, <strong>Offer letter</strong>, or <strong>Email</strong> above.</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
