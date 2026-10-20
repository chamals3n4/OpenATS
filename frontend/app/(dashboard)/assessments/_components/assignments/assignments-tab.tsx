"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Time01Icon } from "@hugeicons/core-free-icons";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { useAssignments, useDeleteAssignment } from "@/hooks/queries/use-assignments";
import { useIsManager } from "@/hooks/use-role";
import { formatDate } from "@/lib/format";
import type { Assignment } from "@/types";
import { AssignmentSendDialog } from "./assignment-send-dialog";

export function AssignmentsTab() {
  const isManager = useIsManager();
  const { data, isLoading } = useAssignments();
  const assignments = data?.data ?? [];
  const remove = useDeleteAssignment();

  const [sending, setSending] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState<Assignment | null>(null);

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
      onError: (error) => {
        toast.error(error.message || "Failed to delete the assignment");
        setDeleting(null);
      },
    });
  };

  return (
    <div className="px-6 py-4">
      {isLoading ? (
        <ListSectionSpinner />
      ) : assignments.length === 0 ? (
        <div className="flex h-56 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 px-6 text-center dark:border-neutral-700">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">No assignments yet</p>
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            Create a take-home task, such as building a small project, and send it to candidates.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <article
              key={assignment.id}
              className="flex flex-col rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex flex-1 flex-col gap-3 p-5">
                <h2 className="line-clamp-1 text-base font-semibold text-slate-900 dark:text-neutral-100">
                  {assignment.title}
                </h2>
                <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-600 dark:text-neutral-400">
                  {assignment.description || (
                    <span className="text-slate-400 dark:text-neutral-500">No description</span>
                  )}
                </p>
                <p className="mt-auto flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-neutral-300">
                  <HugeiconsIcon icon={Time01Icon} className="size-4" />
                  {assignment.dueDays} {assignment.dueDays === 1 ? "day" : "days"} to hand in
                </p>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 px-5 py-3 dark:border-neutral-700">
                <span className="text-sm text-slate-500 dark:text-neutral-400">
                  Created {formatDate(assignment.createdAt)}
                </span>
                {isManager && (
                  <div className="flex shrink-0 items-center gap-2">
                    <RowEditButton icon={SentIcon} onClick={() => setSending(assignment)}>
                      Send
                    </RowEditButton>
                    <RowEditButton render={<Link href={`/assessments/assignments/${assignment.id}`} />} />
                    <RowDeleteButton onClick={() => setDeleting(assignment)} />
                  </div>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}

      <AssignmentSendDialog assignment={sending} onClose={() => setSending(null)} />
      <ConfirmDeleteDialog
        open={!!deleting}
        title="Delete assignment?"
        description={
          <>
            <ConfirmDeleteName>{deleting?.title}</ConfirmDeleteName> and everything candidates handed in for it
            will be deleted. This cannot be undone.
          </>
        }
        isPending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
