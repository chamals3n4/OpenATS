"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
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
import { SettingsSection } from "./settings-section";

const iconButton =
  "size-8 cursor-pointer rounded-md p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

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
      <SettingsSection
        title="Departments"
        description={
          departments.length > 0
            ? `${departments.length} ${departments.length === 1 ? "team" : "teams"} you hire for. Every job belongs to one.`
            : "The teams you hire for. Every job belongs to one."
        }
        action={
          company && !isPending ? (
            <Button
              variant="cancel"
              onClick={() => setAddOpen(true)}
              className="h-8 shrink-0 cursor-pointer gap-1.5 px-3 text-sm"
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
              Add
            </Button>
          ) : undefined
        }
      >
        {!company ? (
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            Save your company profile first, then you can add departments.
          </p>
        ) : isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-md bg-slate-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <>
            {departments.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                No departments yet. Add teams like Engineering or Design to organise your hiring.
              </p>
            ) : (
              <ul className="max-h-[22rem] divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-300 dark:divide-neutral-800 dark:border-neutral-700">
                {departments.map((dept) => (
                  <li key={dept.id} className="flex h-11 items-center justify-between gap-3 pl-4 pr-2">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
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
                        <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Delete ${dept.name}`}
                        title="Delete"
                        onClick={() => setDeleteTarget(dept)}
                        className={`${iconButton} hover:!bg-red-50 hover:!text-red-700 dark:hover:!bg-red-950/40 dark:hover:!text-red-400`}
                      >
                        <HugeiconsIcon icon={Delete01Icon} className="size-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

          </>
        )}
      </SettingsSection>

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
