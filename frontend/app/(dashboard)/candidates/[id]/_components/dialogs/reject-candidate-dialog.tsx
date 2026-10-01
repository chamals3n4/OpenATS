"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serverFetch } from "@/lib/auth-action";
import { REJECTION_REASONS } from "../constants";
import {
  INTERNAL_NOTE_MAX,
  NOTE_REQUIRED_REASON,
  pickRejectionTemplate,
  validateRejection,
} from "../../lib/rejection-utils";
import { SandboxedHtmlPreview } from "../sandboxed-html-preview";
import type { useRejectCandidate } from "@/hooks/queries/use-candidates";
import type { CandidateDetail, Template } from "@/types";

interface RejectCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateDetail;
  candidateId: number;
  /** Name of the stage they are in now, which is where "Restore" would send them back to. */
  stageName?: string | null;
  emailTemplates: Template[];
  rejectMutation: ReturnType<typeof useRejectCandidate>;
}

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

const REASON_ITEMS = REJECTION_REASONS.map((r) => ({ value: r, label: r }));

function RejectForm({
  candidate,
  candidateId,
  stageName,
  emailTemplates,
  rejectMutation,
  onClose,
}: Omit<RejectCandidateDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const errors = validateRejection({ reason, note, sendEmail, templateId });
  const hasTemplates = emailTemplates.length > 0;
  const noteRequired = reason === NOTE_REQUIRED_REASON;
  const templateItems = emailTemplates.map((t) => ({ value: String(t.id), label: t.name }));

  const handleToggleEmail = (on: boolean) => {
    setSendEmail(on);
    setPreview(null);
    // Start from the template that looks like a rejection, if there is one.
    if (on && !templateId) {
      const guess = pickRejectionTemplate(emailTemplates);
      if (guess) setTemplateId(String(guess.id));
    }
  };

  const handlePreview = async () => {
    if (!templateId) return;
    setIsPreviewing(true);
    try {
      const res = await serverFetch<{ data: { subject: string; html: string } }>(
        `/templates/${templateId}/preview`,
        { method: "POST", body: JSON.stringify({ candidateId }) },
      );
      setPreview(res.data);
    } catch {
      toast.error("Could not preview this email");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;

    rejectMutation.mutate(
      {
        id: candidateId,
        data: {
          reason,
          internalNote: note.trim() || undefined,
          templateId: sendEmail ? Number(templateId) : undefined,
          emailStatus: sendEmail ? "sent" : "not_sent",
        },
      },
      {
        onSuccess: () => {
          toast.success(
            sendEmail ? `${fullName} rejected and emailed` : `${fullName} rejected`,
          );
          onClose();
        },
        onError: (error) => toast.error(error.message || "Failed to reject the candidate"),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          Reject {fullName}?
        </DialogTitle>
        <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
          {[candidate.jobTitle, stageName].filter(Boolean).join(" · ") ||
            "This candidate"}
          . They will leave the pipeline, and you can restore them later from
          this tab.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <FormField
          label="Reason"
          htmlFor="reject-reason"
          required
          error={showErrors ? errors.reason : null}
        >
          <Select
            items={REASON_ITEMS}
            value={reason}
            onValueChange={(v) => setReason(v ?? "")}
          >
            <SelectTrigger id="reject-reason" className={selectTriggerCls}>
              <SelectValue placeholder="Choose a reason" />
            </SelectTrigger>
            <SelectContent>
              {REASON_ITEMS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label={noteRequired ? "Internal note" : "Internal note (optional)"}
          htmlFor="reject-note"
          required={noteRequired}
          hint={`Only your team sees this. ${note.length}/${INTERNAL_NOTE_MAX}`}
          error={showErrors ? errors.note : null}
        >
          <Textarea
            id="reject-note"
            value={note}
            maxLength={INTERNAL_NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the team should remember about this decision"
            rows={3}
            className="resize-none border-slate-300 bg-gray-100 text-sm shadow-none dark:border-neutral-600 dark:bg-neutral-800"
          />
        </FormField>

        <div className="rounded-md border border-slate-300 px-4 py-3 dark:border-neutral-700">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="reject-email"
                className="text-sm font-medium text-slate-900 dark:text-neutral-100"
              >
                Email the candidate
              </label>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
                {hasTemplates
                  ? "Sent as soon as you confirm. It can't be unsent."
                  : "Add an email template under Templates to send one."}
              </p>
            </div>
            <Switch
              id="reject-email"
              checked={sendEmail}
              disabled={!hasTemplates}
              onCheckedChange={handleToggleEmail}
              className="data-checked:bg-theme"
            />
          </div>

          {sendEmail && (
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
              <div className="flex items-end gap-2">
                <FormField
                  label="Email template"
                  htmlFor="reject-template"
                  required
                  error={showErrors ? errors.template : null}
                  className="flex-1"
                >
                  <Select
                    items={templateItems}
                    value={templateId}
                    onValueChange={(v) => {
                      setTemplateId(v ?? "");
                      setPreview(null);
                    }}
                  >
                    <SelectTrigger id="reject-template" className={selectTriggerCls}>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateItems.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <Button
                  type="button"
                  variant="cancel"
                  onClick={handlePreview}
                  disabled={!templateId || isPreviewing}
                  className="h-10 gap-2 px-4 text-sm"
                >
                  {isPreviewing && <Spinner className="size-3.5" />}
                  Preview
                </Button>
              </div>

              {preview && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-neutral-400">
                    Subject:{" "}
                    <span className="font-medium text-slate-900 dark:text-neutral-100">
                      {preview.subject}
                    </span>
                  </p>
                  <SandboxedHtmlPreview
                    html={preview.html}
                    title="Rejection email preview"
                    className="h-56"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="cancel"
          onClick={onClose}
          disabled={rejectMutation.isPending}
          className="h-9 px-4 text-sm"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={rejectMutation.isPending}
          className="h-9 gap-2 border-none bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
        >
          {rejectMutation.isPending && <Spinner className="size-3.5" />}
          {rejectMutation.isPending
            ? "Rejecting"
            : sendEmail
              ? "Reject and send email"
              : "Reject candidate"}
        </Button>
      </div>
    </>
  );
}

export function RejectCandidateDialog({
  open,
  onOpenChange,
  ...formProps
}: RejectCandidateDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let Escape or an outside click abandon a rejection that is being saved.
        if (!next && formProps.rejectMutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg gap-5 rounded-xl border-slate-200 bg-white p-6 sm:max-w-lg dark:border-neutral-800 dark:bg-neutral-900">
        {/* Mounted only while open, so every rejection starts from a blank form. */}
        <RejectForm {...formProps} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
