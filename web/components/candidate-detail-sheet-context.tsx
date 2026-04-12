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

type Ctx = {
  previewPane: PreviewPane;
  setPreviewPane: (p: PreviewPane) => void;
  emailSubject: string;
  setEmailSubject: (s: string) => void;
  emailBody: string;
  setEmailBody: (s: string) => void;
  /** Compiled template HTML for the email preview / send; null = plain-text body only. */
  emailHtml: string | null;
  setEmailHtml: (s: string | null) => void;
  /** Template used for the current HTML body (for `email_messages.template_id`). */
  emailTemplateId: number | null;
  setEmailTemplateId: (id: number | null) => void;
};

const CandidateDetailSheetContext = createContext<Ctx | null>(null);

/** Wrap the left preview column and CandidateSidePanel; use `key={candidateId}` when switching candidates. */
export function CandidateDetailSheetProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [previewPane, setPreviewPaneState] = useState<PreviewPane>("resume");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [emailTemplateId, setEmailTemplateId] = useState<number | null>(null);

  const setPreviewPane = useCallback((p: PreviewPane) => {
    setPreviewPaneState(p);
  }, []);

  const value = useMemo(
    () => ({
      previewPane,
      setPreviewPane,
      emailSubject,
      setEmailSubject,
      emailBody,
      setEmailBody,
      emailHtml,
      setEmailHtml,
      emailTemplateId,
      setEmailTemplateId,
    }),
    [
      previewPane,
      setPreviewPane,
      emailSubject,
      emailBody,
      emailHtml,
      emailTemplateId,
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
