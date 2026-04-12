"use client";

import type { ReactNode } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { ResumeScrollView } from "@/components/resume-scroll-view";
import { useCandidate } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useCandidateDetailSheet } from "@/components/candidate-detail-sheet-context";

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

  const showResumePane = previewPane === "resume" && hasResume;
  const showOfferPane = previewPane === "offer" && hasOffer;
  const showEmailPane = previewPane === "email";

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
                subjectEmptyHint={
                  <>
                    Pick an offer template on the <strong>Offer</strong> tab —
                    the preview updates as you edit (like <strong>Email</strong>
                    ), then save to persist.
                  </>
                }
                body={
                  <p className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                    {offer.status === "draft" ? (
                      <>
                        <strong>Draft</strong> — choose a template and fill
                        salary/dates on <strong>Offer</strong>; the letter appears
                        on the left within a moment.
                      </>
                    ) : (
                      <>
                        No letter HTML yet. Open <strong>Offer</strong> →{" "}
                        <strong>Edit</strong> and save to refresh.
                      </>
                    )}
                  </p>
                }
              />
            )}
          </div>
        ) : showEmailPane ? (
          <div className="px-4 py-3">
            <MessagePreviewCard
              toEmail={candidate.email ?? ""}
              subjectLine={emailSubject}
              subjectEmptyHint={
                <>
                  No subject yet — add one under <strong>Send Email</strong>.
                </>
              }
              body={
                emailHtml?.trim() ? (
                  <iframe
                    key={emailHtml.trim()}
                    title="Email preview"
                    sandbox=""
                    className="w-full min-h-[280px] h-[min(52vh,520px)] border-0 rounded-md block bg-white"
                    srcDoc={emailDraftPreviewSrcDoc(emailHtml.trim())}
                  />
                ) : emailBody.trim() ? (
                  <span className="whitespace-pre-wrap">{emailBody}</span>
                ) : (
                  <span className="text-slate-500 dark:text-neutral-400">
                    Your message will appear here when you type or choose a
                    template under <strong>Send Email</strong>.
                  </span>
                )
              }
            />
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
