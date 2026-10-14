"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCandidateEmails } from "@/hooks/queries/use-candidate-emails";
import { formatDateTime, timeAgo } from "@/lib/format";
import { htmlToPlainText } from "../../_lib/email-utils";
import { SandboxedHtmlPreview } from "../sandboxed-html-preview";
import { EmailMessageDialog } from "./email-message-dialog";
import type { CandidateEmail } from "@/types";

/** Label for automatic emails */
const KIND_LABELS: Record<string, string> = {
  application_received: "Application received",
  assessment_invite: "Assessment invite",
  assessment_completed: "Assessment completed",
  interview_invite: "Interview invite",
  interview_slots: "Interview: pick a time",
  interview_confirmed: "Interview confirmed",
  interview_cancelled: "Interview cancelled",
  rejection: "Rejection",
  offer: "Offer",
};

function SentEmailCard({ email }: { email: CandidateEmail }) {
  const [open, setOpen] = useState(false);
  const kindLabel = KIND_LABELS[email.kind];
  const failed = email.status === "failed";

  return (
    <article className="rounded-md border border-slate-300 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <h5 className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-neutral-100">
          {email.subject}
        </h5>
        <span className="shrink-0 text-sm text-slate-500 dark:text-neutral-400">
          {timeAgo(email.sentAt)}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
        {formatDateTime(email.sentAt)}
        <span> · {email.sentByName ?? "Sent automatically"}</span>
      </p>
      {(kindLabel || failed) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {kindLabel && (
            <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              {kindLabel}
            </span>
          )}
          {failed && (
            <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
              Not delivered
            </span>
          )}
        </div>
      )}

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-700 dark:text-neutral-300">
        {htmlToPlainText(email.bodyHtml)}
      </p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mt-2 cursor-pointer text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-neutral-300"
      >
        Read message
      </button>

      <EmailMessageDialog
        open={open}
        onOpenChange={setOpen}
        title={failed ? "Email not delivered" : "Sent email"}
        description={
          failed
            ? `Tried ${formatDateTime(email.sentAt)}, but the mail provider did not accept it.`
            : `Sent ${formatDateTime(email.sentAt)}.`
        }
        rows={[
          { label: "To", value: email.recipientEmail },
          ...(email.sentByName ? [{ label: "From", value: email.sentByName }] : []),
          { label: "Subject", value: <span className="font-semibold">{email.subject}</span> },
        ]}
      >
        <SandboxedHtmlPreview
          html={email.bodyHtml}
          title={`Email: ${email.subject}`}
          className="h-[44vh] rounded-none border-0"
        />
      </EmailMessageDialog>
    </article>
  );
}

export function SentEmails({ candidateId }: { candidateId: number }) {
  const { data, isLoading, isError, refetch, isFetching } = useCandidateEmails(candidateId);
  const emails = data?.data ?? [];

  return (
    <section className="rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-300 px-5 py-4 dark:border-neutral-700">
        <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          Sent emails
        </h4>
        {!isLoading && !isError && (
          <span className="text-sm text-slate-500 dark:text-neutral-400">
            {emails.length} {emails.length === 1 ? "email" : "emails"}
          </span>
        )}
      </header>

      <div className="space-y-3 p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-5" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
              We couldn&apos;t load the sent emails.
            </p>
            <Button
              variant="cancel"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-3 h-9 px-4 text-sm"
            >
              Try again
            </Button>
          </div>
        ) : emails.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center dark:border-neutral-700">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
              <HugeiconsIcon
                icon={Mail01Icon}
                className="size-5 text-slate-500 dark:text-neutral-400"
              />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
              No emails sent yet
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              Messages you send from here are listed with who sent them and when.
            </p>
          </div>
        ) : (
          emails.map((email) => <SentEmailCard key={email.id} email={email} />)
        )}
      </div>
    </section>
  );
}
