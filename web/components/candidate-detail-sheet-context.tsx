"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PreviewPane = "resume" | "offer" | "email";
export type EmailComposerKind = "general" | "interview_invite";

type Ctx = {
  previewPane: PreviewPane;
  setPreviewPane: (p: PreviewPane) => void;
  /** Which composer tab is active — "general" or "interview_invite". */
  emailComposerKind: EmailComposerKind;
  setEmailComposerKind: (k: EmailComposerKind) => void;
  emailSubject: string;
  setEmailSubject: (s: string) => void;
  /** Subject line shown in the Email preview — updated on template pick / Refresh only, not while typing. */
  emailPreviewSubject: string;
  setEmailPreviewSubject: (s: string) => void;
  /** Plain-text body snapshot for the Email preview when not using compiled HTML — updated on Refresh only. */
  emailPreviewPlainBody: string;
  setEmailPreviewPlainBody: (s: string) => void;
  emailBody: string;
  setEmailBody: (s: string) => void;
  /** Compiled template HTML for the email preview / send; null = plain-text body only. */
  emailHtml: string | null;
  setEmailHtml: (s: string | null) => void;
  /** Template used for the current HTML body (for `email_messages.template_id`). */
  emailTemplateId: number | null;
  setEmailTemplateId: (id: number | null) => void;
  /** Offer letter HTML from the last explicit “Refresh letter preview” compile while editing a draft / offer. */
  offerPreviewHtml: string | null;
  setOfferPreviewHtml: (s: string | null) => void;
  offerPreviewSubject: string | null;
  setOfferPreviewSubject: (s: string | null) => void;
};

const CandidateDetailSheetContext = createContext<Ctx | null>(null);

/** Wrap the left preview column and CandidateSidePanel; use `key={candidateId}` when switching candidates. */
export function CandidateDetailSheetProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [previewPane, setPreviewPaneState] = useState<PreviewPane>("resume");
  const [emailComposerKind, setEmailComposerKind] =
    useState<EmailComposerKind>("general");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailPreviewSubject, setEmailPreviewSubject] = useState("");
  const [emailPreviewPlainBody, setEmailPreviewPlainBody] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [emailTemplateId, setEmailTemplateId] = useState<number | null>(null);
  const [offerPreviewHtml, setOfferPreviewHtml] = useState<string | null>(null);
  const [offerPreviewSubject, setOfferPreviewSubject] = useState<string | null>(
    null,
  );

  const setPreviewPane = useCallback((p: PreviewPane) => {
    setPreviewPaneState(p);
  }, []);

  const value = useMemo(
    () => ({
      previewPane,
      setPreviewPane,
      emailComposerKind,
      setEmailComposerKind,
      emailSubject,
      setEmailSubject,
      emailPreviewSubject,
      setEmailPreviewSubject,
      emailPreviewPlainBody,
      setEmailPreviewPlainBody,
      emailBody,
      setEmailBody,
      emailHtml,
      setEmailHtml,
      emailTemplateId,
      setEmailTemplateId,
      offerPreviewHtml,
      setOfferPreviewHtml,
      offerPreviewSubject,
      setOfferPreviewSubject,
    }),
    [
      previewPane,
      setPreviewPane,
      emailComposerKind,
      emailSubject,
      emailPreviewSubject,
      emailPreviewPlainBody,
      emailBody,
      emailHtml,
      emailTemplateId,
      offerPreviewHtml,
      offerPreviewSubject,
    ],
  );

  return (
    <CandidateDetailSheetContext.Provider value={value}>
      {children}
    </CandidateDetailSheetContext.Provider>
  );
}

export function useCandidateDetailSheet() {
  const ctx = useContext(CandidateDetailSheetContext);
  if (!ctx) {
    throw new Error(
      "useCandidateDetailSheet must be used within CandidateDetailSheetProvider",
    );
  }
  return ctx;
}
