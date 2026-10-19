"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSendAssignment } from "@/hooks/queries/use-assignments";
import { useCandidates } from "@/hooks/queries/use-candidates";
import { useJobs } from "@/hooks/queries/use-jobs";
import { usePipeline } from "@/hooks/queries/use-pipeline";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Assignment } from "@/types";

const MAX_SEND = 200;
const PAGE_SIZE = 50;
const ALL_STAGES = "all";
const triggerCls = "h-10 w-full border-slate-200 bg-white text-sm shadow-none focus:ring-0 dark:border-neutral-800 dark:bg-neutral-900";

function SendForm({ assignment, onDone }: { assignment: Assignment; onDone: () => void }) {
  const { data: jobsData } = useJobs();
  const jobs = jobsData?.data ?? [];
  const [jobId, setJobId] = useState("");
  const [stageId, setStageId] = useState(ALL_STAGES);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const send = useSendAssignment();

  const { data: pipeline } = usePipeline(Number(jobId));
  const stages = useMemo(
    () => [...(pipeline?.data ?? [])].sort((a, b) => a.position - b.position),
    [pipeline?.data],
  );
  // Pages are collected as they load; a different job or stage starts the list again.
  const listKey = `${jobId}:${stageId}`;
  const [page, setPage] = useState({ key: listKey, number: 1 });
  const pageNumber = page.key === listKey ? page.number : 1;
  const { data: candidatesData, isLoading, isFetching } = useCandidates(
    Number(jobId) || undefined,
    {
      status: "active",
      limit: PAGE_SIZE,
      page: pageNumber,
      ...(stageId !== ALL_STAGES ? { stageId: Number(stageId) } : {}),
    },
    { enabled: !!jobId },
  );
  type Row = NonNullable<typeof candidatesData>["data"][number];
  const [loaded, setLoaded] = useState<{ key: string; pages: Record<number, Row[]> }>({ key: listKey, pages: {} });
  // Stored while rendering, when a page arrives, rather than in an effect.
  if (candidatesData && loaded.pages[pageNumber] !== candidatesData.data) {
    setLoaded({
      key: listKey,
      pages: { ...(loaded.key === listKey ? loaded.pages : {}), [pageNumber]: candidatesData.data },
    });
  }
  const candidates = useMemo(
    () => (jobId && loaded.key === listKey ? Object.values(loaded.pages).flat() : []),
    [jobId, loaded, listKey],
  );
  const total = jobId ? (candidatesData?.pagination?.total ?? candidates.length) : 0;

  const jobItems = jobs.map((j) => ({ value: String(j.id), label: j.title }));
  const stageItems = [{ value: ALL_STAGES, label: "All stages" }, ...stages.map((s) => ({ value: String(s.id), label: s.name }))];

  const shownIds = candidates.map((c) => c.id);
  const allPicked = shownIds.length > 0 && shownIds.every((id) => picked.has(id));
  const somePicked = shownIds.some((id) => picked.has(id));
  const tooMany = picked.size > MAX_SEND;

  const toggle = (id: number, on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (on: boolean) =>
    setPicked((current) => {
      const next = new Set(current);
      for (const id of shownIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const handleSend = () => {
    send.mutate(
      { candidateIds: [...picked], assignmentId: assignment.id },
      {
        onSuccess: ({ data }) => {
          if (data.sent > 0) toast.success(`Assignment sent to ${data.sent} ${data.sent === 1 ? "candidate" : "candidates"}`);
          if (data.alreadyHad > 0) {
            toast.message("Already sent", {
              description: `${data.alreadyHad} already had this assignment, so no new email was sent.`,
            });
          }
          if (data.failed.length > 0) {
            toast.error(`${data.failed.length} could not be sent`, { description: data.failed[0]?.error });
          }
          if (data.failed.length === 0) onDone();
        },
        onError: (error) => toast.error(error.message || "Failed to send the assignment"),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">Send assignment</DialogTitle>
        <DialogDescription>
          Emails each candidate a private link. They have {assignment.dueDays} {assignment.dueDays === 1 ? "day" : "days"}{" "}
          to hand in. To send to everyone who reaches a stage automatically, attach it on the job&apos;s Assessments tab.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">{assignment.title}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">Job</Label>
            <Select
              items={jobItems}
              value={jobId || null}
              onValueChange={(v) => {
                setJobId(v ?? "");
                setStageId(ALL_STAGES);
                setPicked(new Set());
              }}
            >
              <SelectTrigger className={triggerCls}>
                <SelectValue placeholder="Choose a job…" />
              </SelectTrigger>
              <SelectContent>
                {jobItems.map((j) => (
                  <SelectItem key={j.value} value={j.value} className="text-sm">
                    {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">Stage</Label>
            <Select items={stageItems} value={stageId} onValueChange={(v) => setStageId(v ?? ALL_STAGES)} disabled={!jobId}>
              <SelectTrigger className={triggerCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stageItems.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-sm">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-neutral-800">
          <label className="flex cursor-pointer items-center gap-3 border-b border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-neutral-800 dark:text-neutral-300">
            <Checkbox
              checked={allPicked}
              indeterminate={!allPicked && somePicked}
              disabled={shownIds.length === 0}
              onCheckedChange={(checked) => toggleAll(checked === true)}
            />
            {jobId ? `Select all (${shownIds.length})` : "Choose a job to see its candidates"}
          </label>
          <ul className="max-h-64 overflow-y-auto">
            {isLoading && jobId ? (
              <li className="flex justify-center px-3 py-6">
                <Spinner className="size-4" />
              </li>
            ) : jobId && candidates.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500 dark:text-neutral-400">No active candidates here.</li>
            ) : (
              candidates.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-neutral-900">
                    <Checkbox checked={picked.has(c.id)} onCheckedChange={(checked) => toggle(c.id, checked === true)} />
                    <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-neutral-200">
                      {c.firstName} {c.lastName}
                    </span>
                    {c.stageName && <span className="shrink-0 text-xs text-slate-500 dark:text-neutral-400">{c.stageName}</span>}
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>

        {total > candidates.length && (
          <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-neutral-400">
            <span>
              Showing {candidates.length} of {total} candidates.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => setPage({ key: listKey, number: pageNumber + 1 })}
            >
              {isFetching && <Spinner className="size-3.5" />}
              Load more
            </Button>
          </div>
        )}

        {tooMany && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            You can send to at most {MAX_SEND} candidates at a time.
          </p>
        )}

        <Button
          onClick={handleSend}
          disabled={picked.size === 0 || tooMany || send.isPending}
          className="h-9 w-full gap-2 bg-theme text-white hover:bg-theme-hover"
        >
          {send.isPending && <Spinner className="size-3.5" />}
          {send.isPending ? "Sending" : picked.size > 0 ? `Send to ${picked.size} ${picked.size === 1 ? "candidate" : "candidates"}` : "Send assignment"}
        </Button>
      </div>
    </>
  );
}

export function AssignmentSendDialog({ assignment, onClose }: { assignment: Assignment | null; onClose: () => void }) {
  return (
    <Dialog open={!!assignment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        {assignment && <SendForm assignment={assignment} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
