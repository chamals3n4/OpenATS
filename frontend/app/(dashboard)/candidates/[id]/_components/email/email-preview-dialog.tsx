"use client";

import { EmailMessageDialog } from "./email-message-dialog";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  toAddress: string;
  replyTo?: string;
  subject: string;
  /** The message split into paragraphs, each a list of lines. */
  paragraphs: string[][];
}

/** What the candidate will see, in a dialog so reading it never moves the form. */
export function EmailPreviewDialog({
  open,
  onOpenChange,
  candidateName,
  toAddress,
  replyTo,
  subject,
  paragraphs,
}: EmailPreviewDialogProps) {
  return (
    <EmailMessageDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Email preview"
      description={`How ${candidateName} will see this message.`}
      rows={[
        { label: "To", value: toAddress },
        ...(replyTo ? [{ label: "Reply to", value: replyTo }] : []),
        {
          label: "Subject",
          value: subject.trim() ? (
            <span className="font-semibold">{subject.trim()}</span>
          ) : (
            <span className="italic text-slate-500 dark:text-neutral-400">
              No subject yet
            </span>
          ),
        },
      ]}
    >
      <div className="space-y-4 px-5 py-5 text-[15px] leading-relaxed text-slate-800 dark:text-neutral-200">
        {paragraphs.length === 0 ? (
          <p className="italic text-slate-500 dark:text-neutral-400">No message yet</p>
        ) : (
          paragraphs.map((lines, i) => (
            <p key={i}>
              {lines.map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          ))
        )}
      </div>
    </EmailMessageDialog>
  );
}
