"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { MailSend01Icon } from "@hugeicons/core-free-icons";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSendCandidateEmail } from "@/hooks/queries/use-candidate-emails";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { EmailPreviewDialog } from "./email-preview-dialog";
import {
  BODY_MAX,
  SUBJECT_MAX,
  chosenReplyTo,
  splitParagraphs,
  validateEmail,
} from "../../lib/email-utils";
import type { CandidateDetail } from "@/types";

export function EmailComposer({ candidate }: { candidate: CandidateDetail }) {
  const send = useSendCandidateEmail(candidate.id);
  // Replies are addressed to whoever sends, so say so before they do.
  const { data: meData } = useCurrentUser();
  const replyAddress = meData?.data?.email;
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [replyTo, setReplyTo] = useState("");
  const [editingReply, setEditingReply] = useState(false);

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const errors = validateEmail({ subject, body, replyTo });
  const chosenReply = chosenReplyTo(replyTo, replyAddress);
  const effectiveReply = chosenReply ?? replyAddress;
  const hasContent = Boolean(subject.trim() || body.trim());
  const paragraphs = splitParagraphs(body);

  const handleSend = () => {
    setShowErrors(true);
    if (errors.replyTo) setEditingReply(true);
    if (errors.subject || errors.body || errors.replyTo) return;
    setConfirmOpen(true);
  };

  const handleConfirm = () =>
    send.mutate(
      { subject: subject.trim(), body: body.trim(), replyTo: chosenReply },
      {
        onSuccess: () => {
          toast.success(`Email sent to ${candidate.firstName}`);
          setSubject("");
          setBody("");
          setShowErrors(false);
          setShowPreview(false);
          setConfirmOpen(false);
          setReplyTo("");
          setEditingReply(false);
        },
        onError: (error) => {
          toast.error(error.message || "We couldn't send the email. Please try again.");
          setConfirmOpen(false);
        },
      },
    );

  return (
    <section className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <header className="border-b border-slate-300 px-5 py-4 dark:border-neutral-700">
        <h4 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
          New message
        </h4>
      </header>

      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-slate-300 bg-slate-50 px-4 py-2.5 text-[15px] dark:border-neutral-700 dark:bg-neutral-950/40">
          <span className="text-sm font-medium text-slate-500 dark:text-neutral-400">To</span>
          <span className="font-medium text-slate-900 dark:text-neutral-100">{fullName}</span>
          <span className="text-slate-600 dark:text-neutral-400">{candidate.email}</span>
        </div>
        {replyAddress && (
          <div className="-mt-2 px-1">
            {editingReply ? (
              <FormField
                label="Send replies to"
                htmlFor="email-reply-to"
                error={showErrors ? errors.replyTo : null}
                hint="Leave it empty to use your own address. Replies don't appear in OpenATS."
              >
                <div className="flex gap-2">
                  <Input
                    id="email-reply-to"
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder={replyAddress}
                    className={`${inputCls} flex-1`}
                  />
                  <Button
                    type="button"
                    variant="cancel"
                    onClick={() => {
                      setReplyTo("");
                      setEditingReply(false);
                    }}
                    className="h-10 shrink-0 px-4 text-sm"
                  >
                    Use my address
                  </Button>
                </div>
              </FormField>
            ) : (
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Replies go to{" "}
                <span className="font-medium text-slate-700 dark:text-neutral-300">
                  {effectiveReply}
                </span>
                . They won&apos;t appear in OpenATS.{" "}
                <button
                  type="button"
                  onClick={() => setEditingReply(true)}
                  className="cursor-pointer font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  Change
                </button>
              </p>
            )}
          </div>
        )}

        <FormField
          label="Subject"
          htmlFor="email-subject"
          required
          error={showErrors ? errors.subject : null}
          hint={`${subject.trim().length}/${SUBJECT_MAX}`}
        >
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Next steps for the Software Engineer role"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Message"
          htmlFor="email-body"
          required
          error={showErrors ? errors.body : null}
          hint={`Plain text. A blank line starts a new paragraph. ${body.trim().length.toLocaleString("en-US")}/${BODY_MAX.toLocaleString("en-US")}`}
        >
          <Textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message"
            rows={10}
            className="min-h-60 resize-y border-slate-300 bg-gray-100 text-[15px] leading-relaxed shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </FormField>

      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 bg-slate-50 px-5 py-3.5 dark:border-neutral-700 dark:bg-neutral-950/50">
        <Button
          variant="cancel"
          onClick={() => setShowPreview(true)}
          disabled={!hasContent}
          className="h-9 px-4 text-sm"
        >
          Preview
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="cancel"
            disabled={!hasContent || send.isPending}
            onClick={() => {
              setSubject("");
              setBody("");
              setShowErrors(false);
            }}
            className="h-9 px-4 text-sm"
          >
            Clear
          </Button>
          <Button
            onClick={handleSend}
            disabled={send.isPending}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            <HugeiconsIcon icon={MailSend01Icon} className="size-4" strokeWidth={1.75} />
            Send email
          </Button>
        </div>
      </footer>

      <EmailPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        candidateName={candidate.firstName}
        toAddress={`${fullName} <${candidate.email}>`}
        replyTo={effectiveReply}
        subject={subject}
        paragraphs={paragraphs}
      />

      <ConfirmDeleteDialog
        open={confirmOpen}
        title="Send this email?"
        description={
          <>
            <ConfirmDeleteName>{fullName}</ConfirmDeleteName> will receive it at{" "}
            {candidate.email}. You can&apos;t unsend it.
            {effectiveReply && <> Replies will go to {effectiveReply}.</>}
          </>
        }
        confirmLabel="Send email"
        pendingLabel="Sending"
        confirmClassName="bg-theme hover:bg-theme-hover"
        isPending={send.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
