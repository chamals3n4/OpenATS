import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { timeAgo } from "../constants";
import { formatDateTime } from "../../lib/format-datetime";
import { describeRejectionEmail, type EmailTone } from "../../lib/rejection-utils";
import type { CandidateRejection } from "@/types";

interface RejectionCardProps {
  rejection: CandidateRejection;
  stageName: string | null;
  /** Null when the viewer cannot see names (only managers can list users). */
  rejectedByName: string | null;
  templateName: string | null;
  /** True for the newest rejection while the candidate is still rejected. */
  isCurrent: boolean;
}

const EMAIL_TONE: Record<EmailTone, string> = {
  sent: "text-slate-800 dark:text-neutral-200",
  draft: "text-amber-800 dark:text-amber-300",
  none: "text-slate-500 dark:text-neutral-400",
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[15px] font-medium text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
    </div>
  );
}

export function RejectionCard({
  rejection,
  stageName,
  rejectedByName,
  templateName,
  isCurrent,
}: RejectionCardProps) {
  const email = describeRejectionEmail(rejection, templateName);

  return (
    <article className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          {stageName ? `Rejected from ${stageName}` : "Rejected"}
        </h4>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            isCurrent
              ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
              : "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300"
          }`}
        >
          {isCurrent ? "Current" : "Restored"}
        </span>
      </header>

      <dl className="grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3">
        <Fact label="Reason">{rejection.reason || "No reason given"}</Fact>
        <Fact label="When">
          {formatDateTime(rejection.rejectedAt)}
          <span className="mt-0.5 block text-sm font-normal text-slate-500 dark:text-neutral-400">
            {timeAgo(rejection.rejectedAt)}
          </span>
        </Fact>
        {rejectedByName && <Fact label="Rejected by">{rejectedByName}</Fact>}
      </dl>

      <div className="border-t border-slate-300 px-5 py-3 dark:border-neutral-700">
        <p className={`flex items-center gap-2 text-sm ${EMAIL_TONE[email.tone]}`}>
          <HugeiconsIcon icon={Mail01Icon} className="size-4 shrink-0" strokeWidth={1.75} />
          {email.label}
          {email.tone === "sent" && rejection.sentAt && (
            <span className="text-slate-500 dark:text-neutral-400">
              on {formatDateTime(rejection.sentAt)}
            </span>
          )}
        </p>
      </div>

      {rejection.internalNote && (
        <div className="border-t border-slate-300 px-5 py-4 dark:border-neutral-700">
          <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
            Internal note (not shown to the candidate)
          </p>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
            {rejection.internalNote}
          </p>
        </div>
      )}
    </article>
  );
}
