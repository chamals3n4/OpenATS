"use client";

import { useIsManager } from "@/hooks/use-role";
import { EmailComposer } from "../email/email-composer";
import { SentEmails } from "../email/sent-emails";
import type { CandidateDetail } from "@/types";

interface EmailSectionProps {
  candidate: CandidateDetail;
}

export function EmailSection({ candidate }: EmailSectionProps) {
  const isManager = useIsManager();

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Send Email
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Compose and send a message to the candidate
        </p>
      </div>

      <div
        className={
          isManager
            ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]"
            : "max-w-xl"
        }
      >
        {isManager ? (
          <EmailComposer candidate={candidate} />
        ) : null}
        <SentEmails candidateId={candidate.id} />
      </div>

      {!isManager && (
        <p className="mt-4 text-sm text-slate-500 dark:text-neutral-400">
          Only hiring managers can email candidates. You can see what has been
          sent.
        </p>
      )}
    </div>
  );
}
