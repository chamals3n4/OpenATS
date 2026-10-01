"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building03Icon,
  Delete01Icon,
  Edit02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
} from "@/hooks/queries/use-company";
import type { Company, Department } from "@/types";
import { DepartmentNameDialog } from "./department-name-dialog";

const iconButton =
  "size-8 rounded-md p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

export function DepartmentsPanel({
  company,
}: {
  company: Company | null | undefined;
}) {
  const { data, isPending } = useDepartments({ enabled: !!company });
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const departments = data?.data ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const handleAdd = (name: string) =>
    createDept.mutate(
      { name },
      {
        onSuccess: () => {
          setAddOpen(false);
          toast.success("Department added");
        },
        onError: () => toast.error("Failed to add department"),
      },
    );

  const handleEdit = (name: string) => {
    if (!editTarget) return;
    updateDept.mutate(
      { id: editTarget.id, name },
      {
        onSuccess: () => {
          setEditTarget(null);
          toast.success("Department updated");
        },
        onError: () => toast.error("Failed to update department"),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteDept.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast.success("Department deleted");
      },
      onError: () => toast.error("Failed to delete department"),
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-neutral-100">
              Departments
              {departments.length > 0 && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-400 bg-amber-50 px-1 text-xs font-semibold text-amber-800 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-300">
                  {departments.length}
                </span>
              )}
            </h2>
          </div>
          {company && departments.length > 0 && (
            <Button
              onClick={() => setAddOpen(true)}
              className="h-8 shrink-0 gap-1.5 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="size-4"
                strokeWidth={2}
              />
              New department
            </Button>
          )}
        </div>

        {!company ? (
          <p className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
            Save your company profile first, then you can add departments.
          </p>
        ) : isPending ? (
          <div className="space-y-px border-t border-slate-200 dark:border-neutral-800">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse bg-slate-50 dark:bg-neutral-800/50"
              />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-slate-200 px-6 py-10 text-center dark:border-neutral-800">
            <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
              <HugeiconsIcon icon={Building03Icon} className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                No departments yet
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
                Add teams like Engineering or Design to organise your hiring.
              </p>
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="size-4"
                strokeWidth={2}
              />
              Add department
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-neutral-800 dark:border-neutral-800">
            {departments.map((dept) => (
              <li
                key={dept.id}
                className="flex h-12 items-center justify-between gap-3 px-6 hover:bg-slate-50 dark:hover:bg-neutral-800/40"
              >
                <span className="truncate text-[15px] font-medium text-slate-900 dark:text-neutral-100">
                  {dept.name}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    aria-label={`Rename ${dept.name}`}
                    title="Rename"
                    onClick={() => setEditTarget(dept)}
                    className={iconButton}
                  >
                    <HugeiconsIcon
                      icon={Edit02Icon}
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${dept.name}`}
                    title="Delete"
                    onClick={() => setDeleteTarget(dept)}
                    className={`${iconButton} hover:!bg-red-50 hover:!text-red-700 dark:hover:!bg-red-950/40 dark:hover:!text-red-400`}
                  >
                    <HugeiconsIcon
                      icon={Delete01Icon}
                      className="size-4"
                      strokeWidth={1.75}
                    />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DepartmentNameDialog
        open={addOpen}
        title="Add department"
        submitLabel="Add department"
        pendingLabel="Adding"
        isPending={createDept.isPending}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
      />
      <DepartmentNameDialog
        open={editTarget !== null}
        title="Rename department"
        submitLabel="Save"
        pendingLabel="Saving"
        initialName={editTarget?.name}
        isPending={updateDept.isPending}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete this department?"
        description={
          <>
            <ConfirmDeleteName>{deleteTarget?.name}</ConfirmDeleteName> will be
            permanently deleted. This cannot be undone.
          </>
        }
        isPending={deleteDept.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
