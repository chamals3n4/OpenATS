"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAssignments, useSendAssignment } from "@/hooks/queries/use-assignments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function SendForm({ candidateId, onDone }: { candidateId: number; onDone: () => void }) {
  const { data } = useAssignments();
  const assignments = data?.data ?? [];
  const [assignmentId, setAssignmentId] = useState("");
  const send = useSendAssignment();
  const items = assignments.map((a) => ({ value: String(a.id), label: a.title }));
  const picked = assignments.find((a) => String(a.id) === assignmentId);

  const handleSend = () =>
    send.mutate(
      { candidateIds: [candidateId], assignmentId: Number(assignmentId) },
      {
        onSuccess: ({ data: result }) => {
          if (result.failed.length > 0) return void toast.error(result.failed[0]?.error ?? "Failed to send the assignment");
          if (result.sent > 0) toast.success("Assignment sent. The candidate has the link by email.");
          else toast.message("Already sent", { description: "They already have this assignment. No new email was sent." });
          onDone();
        },
        onError: (error) => toast.error(error.message || "Failed to send the assignment"),
      },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">Send an assignment</DialogTitle>
        <DialogDescription>Emails this candidate a private link to a take-home assignment.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">Assignment</Label>
          <Select items={items} value={assignmentId || null} onValueChange={(v) => setAssignmentId(v ?? "")}>
            <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-sm shadow-none focus:ring-0 dark:border-neutral-800 dark:bg-neutral-900">
              <SelectValue placeholder={items.length === 0 ? "No assignments yet" : "Choose an assignment…"} />
            </SelectTrigger>
            <SelectContent>
              {items.map((a) => (
                <SelectItem key={a.value} value={a.value} className="text-sm">
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {picked && (
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              They get {picked.dueDays} {picked.dueDays === 1 ? "day" : "days"} to hand in.
            </p>
          )}
        </div>
        <Button
          onClick={handleSend}
          disabled={!assignmentId || send.isPending}
          className="h-9 w-full gap-2 bg-theme text-white hover:bg-theme-hover"
        >
          {send.isPending && <Spinner className="size-3.5" />}
          {send.isPending ? "Sending" : "Send assignment"}
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
      <DialogContent className="max-w-md border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        {open && <SendForm candidateId={candidateId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
