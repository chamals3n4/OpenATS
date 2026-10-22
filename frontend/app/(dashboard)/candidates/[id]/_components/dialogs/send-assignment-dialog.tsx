"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAssignments, usePreviewAssignmentEmail, useSendAssignment, type AssignmentEmailPreview } from "@/hooks/queries/use-assignments";
import { Input } from "@/components/ui/input";
import { SandboxedHtmlPreview } from "../sandboxed-html-preview";
import { Button } from "@/components/ui/button";
import { FormField, inputCls } from "@/components/form/form-field";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const selectTriggerCls =
  "h-10! w-full rounded-md border border-slate-300 bg-gray-100 px-3! py-0! text-sm text-slate-900 shadow-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100";

function SendForm({ candidateId, onDone }: { candidateId: number; onDone: () => void }) {
  const { data } = useAssignments();
  const assignments = data?.data ?? [];
  const [assignmentId, setAssignmentId] = useState("");
  const send = useSendAssignment();
  const previewMail = usePreviewAssignmentEmail();
  // Set when "Send by email" is chosen: the email is shown here first and sent only on confirm
  const [preview, setPreview] = useState<AssignmentEmailPreview | null>(null);
  const items = assignments.map((a) => ({ value: String(a.id), label: a.title }));
  const picked = assignments.find((a) => String(a.id) === assignmentId);

  // Set once a link is made without an email, so staff can copy it and send it themselves
  const [link, setLink] = useState<string | null>(null);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  const showPreview = () =>
    previewMail.mutate(
      { candidateId, assignmentId: Number(assignmentId) },
      {
        onSuccess: ({ data }) => setPreview(data),
        onError: (error) => toast.error(error.message || "Could not build the email preview"),
      },
    );

  const give = (email: boolean) =>
    send.mutate(
      { candidateId, assignmentId: Number(assignmentId), email },
      {
        onSuccess: ({ data: result }) => {
          if (result.status === "emailed") {
            toast.success("Assignment sent. The candidate has the link by email.");
            return onDone();
          }
          if (email) toast.message("They already have this assignment");
          setLink(result.url);
        },
        onError: (error) => toast.error(error.message || "Failed to send the assignment"),
      },
    );

  const titleCls = "text-lg font-semibold text-slate-900 dark:text-neutral-100";
  const descriptionCls = "text-sm text-slate-600 dark:text-neutral-400";
  const secondaryCls = "h-9 px-4 text-sm";
  const primaryCls = "h-9 gap-2 border-none bg-theme px-4 text-sm font-medium text-white hover:bg-theme-hover";

  if (preview) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className={titleCls}>Check the email</DialogTitle>
          <DialogDescription className={descriptionCls}>
            This is what the candidate will get. Nothing is sent until you confirm, and their private link is made then.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="space-y-1 text-sm text-slate-600 dark:text-neutral-400">
            <p>
              To: <span className="font-medium text-slate-900 dark:text-neutral-100">{preview.to}</span>
            </p>
            <p>
              Subject: <span className="font-medium text-slate-900 dark:text-neutral-100">{preview.subject}</span>
            </p>
          </div>
          <SandboxedHtmlPreview html={preview.html} title="Assignment email preview" className="h-72" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="cancel" className={secondaryCls} disabled={send.isPending} onClick={() => setPreview(null)}>
            Back
          </Button>
          <Button onClick={() => give(true)} disabled={send.isPending} className={primaryCls}>
            {send.isPending && <Spinner className="size-3.5" />}
            {send.isPending ? "Sending" : "Confirm and send"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className={titleCls}>Send an assignment</DialogTitle>
        <DialogDescription className={descriptionCls}>
          Email this candidate a private link to a take-home assignment, or get the link and send it yourself.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <FormField
          label="Assignment"
          htmlFor="send-assignment"
          hint={picked ? `They get ${picked.dueDays} ${picked.dueDays === 1 ? "day" : "days"} to hand in.` : undefined}
        >
          <Select
            items={items}
            value={assignmentId || null}
            onValueChange={(v) => {
              setAssignmentId(v ?? "");
              setLink(null);
            }}
          >
            <SelectTrigger id="send-assignment" className={selectTriggerCls}>
              <SelectValue placeholder={items.length === 0 ? "No assignments yet" : "Choose an assignment"} />
            </SelectTrigger>
            <SelectContent>
              {items.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {link && (
          <FormField label="Private link" htmlFor="send-assignment-link" hint="Send this to the candidate yourself.">
            <div className="flex gap-2">
              <Input
                id="send-assignment-link"
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className={inputCls}
              />
              <Button type="button" variant="cancel" className="h-10 gap-1.5 px-3 text-sm" onClick={() => copy(link)}>
                <HugeiconsIcon icon={Copy01Icon} className="size-4" />
                Copy
              </Button>
            </div>
          </FormField>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="cancel" className={secondaryCls} onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="cancel"
          onClick={() => give(false)}
          disabled={!assignmentId || send.isPending}
          className={secondaryCls}
        >
          Get link only
        </Button>
        <Button onClick={showPreview} disabled={!assignmentId || previewMail.isPending} className={primaryCls}>
          {previewMail.isPending && <Spinner className="size-3.5" />}
          Send by email
        </Button>
      </div>
    </>
  );
}

export function SendAssignmentDialog({
  open,
  candidateId,
  onOpenChange,
}: {
  open: boolean;
  candidateId: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-5 rounded-xl border-slate-200 bg-white p-6 sm:max-w-lg dark:border-neutral-800 dark:bg-neutral-900">
        {open && <SendForm candidateId={candidateId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
