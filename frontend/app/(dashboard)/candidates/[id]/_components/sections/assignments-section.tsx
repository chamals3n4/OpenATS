"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useIsManager } from "@/hooks/use-role";
import { isWebUrl } from "@/components/assignment/assignment-brief";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { useCandidateAssignments } from "@/hooks/queries/use-assignments";
import { formatDateTime } from "@/lib/format";
import type { CandidateAssignment } from "@/types";
import { SendAssignmentDialog } from "../dialogs/send-assignment-dialog";

/** Pending is shown as overdue once the deadline passes, because the periodic check can lag behind. */
function describe(item: CandidateAssignment) {
  const overdue = item.status === "pending" && new Date(item.dueAt) < new Date();
  if (item.status === "submitted") {
    return { label: "Handed in", style: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" };
  }
  if (item.status === "expired" || overdue) {
    return { label: "Not handed in", style: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" };
  }
  return { label: "Waiting", style: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" };
}

export function AssignmentsSection({ candidateId }: { candidateId: number }) {
  const { data, isLoading } = useCandidateAssignments(candidateId);
  const items = data?.data ?? [];
  const isManager = useIsManager();
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">Assignments</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Take-home tasks sent to this candidate, and what they handed in
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => setSendOpen(true)}
            className="h-9 cursor-pointer gap-2 rounded-md border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
          >
            <HugeiconsIcon icon={SentIcon} className="size-4" />
            Send an assignment
          </Button>
        )}
      </div>
      <SendAssignmentDialog open={sendOpen} candidateId={candidateId} onOpenChange={setSendOpen} />

      {isLoading ? (
        <ListSectionSpinner />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-neutral-400">
          Nothing sent yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const { label, style } = describe(item);
            return (
              <li
                key={item.id}
                className="rounded-md border border-slate-300 p-4 dark:border-neutral-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">{item.title}</p>
                  <span className="flex items-center gap-2">
                    {isManager && label === "Waiting" && (
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(`${window.location.origin}/assignment/${item.token}`)
                            .then(() => toast.success("Link copied"), () => toast.error("Could not copy the link"))
                        }
                        className="cursor-pointer text-xs font-medium text-theme hover:underline dark:text-primary"
                      >
                        Copy link
                      </button>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                  Sent {formatDateTime(item.createdAt)} · Due {formatDateTime(item.dueAt)}
                  {item.submittedAt && ` · Handed in ${formatDateTime(item.submittedAt)}`}
                </p>

                {item.submissionFields.some((field) => item.submissionAnswers[field.id]) && (
                  <dl className="mt-3 space-y-3">
                    {item.submissionFields
                      .filter((field) => item.submissionAnswers[field.id])
                      .map((field) => {
                        const answer = item.submissionAnswers[field.id]!;
                        return (
                          <div key={field.id}>
                            <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">{field.label}</dt>
                            <dd className="mt-0.5 whitespace-pre-line break-all text-sm">
                              {field.type === "link" && isWebUrl(answer) ? (
                                <a
                                  href={answer}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-theme hover:underline dark:text-primary"
                                >
                                  {answer}
                                </a>
                              ) : (
                                <span className="text-slate-700 dark:text-neutral-300">{answer}</span>
                              )}
                            </dd>
                          </div>
                        );
                      })}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
