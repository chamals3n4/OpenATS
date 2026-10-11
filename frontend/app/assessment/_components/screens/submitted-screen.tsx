"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import type { AttemptData } from "../../_lib/assessment-types";
import { MessageScreen } from "./message-screen";

interface SubmittedScreenProps {
  attempt: AttemptData | null;
  total: number;
  answered: number;
}

export function SubmittedScreen({ attempt, total, answered }: SubmittedScreenProps) {
  return (
    <MessageScreen icon={CheckmarkCircle02Icon} tone="success" title="Assessment submitted">
      <p>
        Thank you{attempt ? `, ${attempt.candidate.firstName}` : ""}. Your answers
        {attempt ? ` for ${attempt.assessment.title}` : ""} have been received.
      </p>
      <p className="rounded-md border border-slate-300 px-4 py-3 text-slate-900 dark:border-neutral-700 dark:text-neutral-100">
        You answered <span className="font-semibold">{answered}</span> of{" "}
        <span className="font-semibold">{total}</span> question{total === 1 ? "" : "s"}.
      </p>
      <p>
        The hiring team will review your result and contact you about the next steps.
        {attempt && <> A confirmation has been sent to {attempt.candidate.email}.</>}
      </p>
      <p className="text-sm">You can close this page.</p>
    </MessageScreen>
  );
}
