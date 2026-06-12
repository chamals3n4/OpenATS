"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUpdateInterview } from "@/hooks/queries/use-interviews";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: any;
  eventName: string;
  onEventNameChange: (v: string) => void;
  meetingUrl: string;
  onMeetingUrlChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  outcome: string;
  onOutcomeChange: (v: string) => void;
}

export function EditDialog({
  open,
  onOpenChange,
  target,
  eventName,
  onEventNameChange,
  meetingUrl,
  onMeetingUrlChange,
  status,
  onStatusChange,
  outcome,
  onOutcomeChange,
}: EditDialogProps) {
  const updateInterviewMutation = useUpdateInterview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
            Edit Interview
          </DialogTitle>
          {target && (
            <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
              {target.candidateName} · {target.jobTitle}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div>
            <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
              Event name
            </Label>
            <Input
              value={eventName}
              onChange={(e) => onEventNameChange(e.target.value)}
              placeholder="e.g. Technical Interview"
              className="h-8 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus-visible:ring-1 focus-visible:ring-[var(--theme-color)] focus-visible:border-[var(--theme-color)]"
            />
          </div>
          <div>
            <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
              Meeting URL
            </Label>
            <Input
              value={meetingUrl}
              onChange={(e) => onMeetingUrlChange(e.target.value)}
              placeholder="https://meet.google.com/…"
              className="h-8 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus-visible:ring-1 focus-visible:ring-[var(--theme-color)] focus-visible:border-[var(--theme-color)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => onStatusChange(v || "")}
              >
                <SelectTrigger className="h-8 w-full rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus:ring-0 focus-visible:ring-0">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <SelectItem value="pending_schedule">
                    Awaiting Slot
                  </SelectItem>
                  <SelectItem value="scheduled">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[13px] font-medium text-slate-600 dark:text-neutral-400 mb-1.5 block">
                Outcome
              </Label>
              <Select
                value={outcome}
                onValueChange={(v) => onOutcomeChange(v || "pending")}
              >
                <SelectTrigger className="h-8 w-full rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-sm focus:ring-0 focus-visible:ring-0">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent className="rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pass">Passed</SelectItem>
                  <SelectItem value="fail">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-md border-none bg-neutral-700 px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                await updateInterviewMutation.mutateAsync({
                  id: target.id,
                  eventName: eventName || undefined,
                  meetingUrl: meetingUrl || null,
                  status: (status || undefined) as
                    | "pending_schedule"
                    | "scheduled"
                    | "completed"
                    | "cancelled"
                    | undefined,
                  outcome: (outcome || undefined) as
                    | "pending"
                    | "pass"
                    | "fail"
                    | undefined,
                });
                toast.success("Interview updated");
                onOpenChange(false);
              } catch {
                toast.error("Failed to update interview");
              }
            }}
            disabled={updateInterviewMutation.isPending}
            className="h-8 rounded-md border-none px-4 text-sm font-semibold leading-none text-white shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: "var(--theme-color)" }}
          >
            {updateInterviewMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
