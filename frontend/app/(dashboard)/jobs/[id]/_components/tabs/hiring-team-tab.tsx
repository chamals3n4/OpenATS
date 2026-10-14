"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { RowDeleteButton } from "@/components/table/row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { HiringTeamMember, User } from "@/types";
import type { useRemoveHiringTeamMember } from "@/hooks/queries/use-jobs";
import { useIsManager } from "@/hooks/use-role";

interface HiringTeamTabProps {
  team: HiringTeamMember[];
  allUsers: User[];
  addTeamMemberOpen: boolean;
  setAddTeamMemberOpen: (open: boolean) => void;
  newMemberId: string;
  setNewMemberId: (id: string) => void;
  handleAddTeamMember: () => void;
  addTeamMemberMutationPending: boolean;
  removeTeamMemberMutation: ReturnType<typeof useRemoveHiringTeamMember>;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hiring_manager: "Hiring Manager",
  interviewer: "Interviewer",
};

/** How many people the add dialog lists at once. With hundreds of users, the rest are found by searching. */
const MAX_SHOWN = 6;

type Person = Pick<User, "firstName" | "lastName" | "avatarUrl">;

const fullName = (user: Pick<User, "firstName" | "lastName">) => `${user.firstName} ${user.lastName}`.trim();

function Avatar({ user }: { user: Person }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-theme/10 text-sm font-semibold text-theme dark:text-primary"
    >
      {user.firstName.charAt(0)}
      {user.lastName.charAt(0)}
    </span>
  );
}

function RoleTag({ role }: { role: string | null | undefined }) {
  if (!role) return null;
  return (
    <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function HiringTeamTab({
  team,
  allUsers,
  addTeamMemberOpen,
  setAddTeamMemberOpen,
  newMemberId,
  setNewMemberId,
  handleAddTeamMember,
  addTeamMemberMutationPending,
  removeTeamMemberMutation,
}: HiringTeamTabProps) {
  const isManager = useIsManager();
  const [removeTarget, setRemoveTarget] = useState<HiringTeamMember | null>(null);
  const [search, setSearch] = useState("");

  // People who can still be added: active, and not on the team already.
  const candidates = allUsers.filter(
    (user) => user.isActive !== false && !team.some((member) => member.userId === user.id),
  );
  const query = search.trim().toLowerCase();
  const matches = query
    ? candidates.filter((user) => `${fullName(user)} ${user.email}`.toLowerCase().includes(query))
    : candidates;
  const shown = matches.slice(0, MAX_SHOWN);
  const picked = candidates.find((user) => String(user.id) === newMemberId);

  const closeAdd = () => {
    setAddTeamMemberOpen(false);
    setNewMemberId("");
    setSearch("");
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeTeamMemberMutation.mutate(removeTarget.userId, {
      onSuccess: () => {
        toast.success(`${fullName(removeTarget)} removed from the team`);
        setRemoveTarget(null);
      },
      onError: (error) => toast.error(error.message || "Failed to remove the member"),
    });
  };

  const addButton = (extra = "") => (
    <Button
      type="button"
      onClick={() => setAddTeamMemberOpen(true)}
      className={`h-9 shrink-0 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover ${extra}`}
    >
      <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2.5} />
      Add member
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">Hiring team</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            The people who can see this job and its candidates. Super Admins can always see it.
          </p>
        </div>
        {isManager && team.length > 0 && addButton()}
      </div>

      {team.length > 0 ? (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-300 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
          {team.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <Avatar user={member} />
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-[15px] font-medium text-slate-900 dark:text-neutral-100">
                  {fullName(member)}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-neutral-400">{member.email}</p>
              </div>
              <RoleTag role={member.role} />
              {member.isJobCreator ? (
                <span className="text-sm text-slate-500 dark:text-neutral-400">Created this job</span>
              ) : isManager ? (
                <RowDeleteButton
                  aria-label={`Remove ${fullName(member)} from the team`}
                  onClick={() => setRemoveTarget(member)}
                >
                  Remove
                </RowDeleteButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">No one is on this team yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">
            Add the hiring managers and interviewers who will work on this job.
          </p>
          {isManager && addButton("mt-4")}
        </div>
      )}

      <Dialog open={addTeamMemberOpen} onOpenChange={(open) => (open ? setAddTeamMemberOpen(true) : closeAdd())}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-xl border-slate-200 bg-white p-0 sm:max-w-[520px] dark:border-neutral-800 dark:bg-neutral-900">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
              Add a team member
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-neutral-400">
              They will be able to see this job and its candidates. What they can do depends on their role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-6 py-5">
            {candidates.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 dark:border-neutral-700 dark:text-neutral-400">
                Everyone is already on this team. New users are created under Settings, in User management.
              </p>
            ) : (
              <>
                <div className="relative">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-500 dark:text-neutral-400"
                  />
                  <Input
                    type="search"
                    autoFocus
                    aria-label="Search people by name or email"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 rounded-md border border-slate-300 bg-gray-100 pl-9 text-sm shadow-none focus-visible:border-theme focus-visible:ring-0 dark:border-neutral-600 dark:bg-neutral-800"
                  />
                </div>

                {shown.length === 0 ? (
                  <p className="px-1 py-4 text-sm text-slate-600 dark:text-neutral-400">
                    No one matches &quot;{search.trim()}&quot;.
                  </p>
                ) : (
                  <ul
                    role="listbox"
                    aria-label="People you can add"
                    className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-300 dark:divide-neutral-800 dark:border-neutral-700"
                  >
                    {shown.map((user) => {
                      const selected = String(user.id) === newMemberId;
                      return (
                        <li key={user.id} role="option" aria-selected={selected}>
                          <button
                            type="button"
                            onClick={() => setNewMemberId(selected ? "" : String(user.id))}
                            className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-theme ${
                              selected ? "bg-theme/10" : "hover:bg-slate-50 dark:hover:bg-neutral-800/60"
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-slate-900 dark:text-neutral-100">
                                {fullName(user)}
                              </span>
                              <span className="block truncate text-[13px] text-slate-500 dark:text-neutral-400">
                                {[ROLE_LABELS[user.role] ?? user.role, user.email].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                            <HugeiconsIcon
                              icon={Tick02Icon}
                              className={`size-4 shrink-0 text-theme dark:text-primary ${selected ? "" : "invisible"}`}
                              strokeWidth={2.5}
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <p aria-live="polite" className="px-1 text-[13px] text-slate-500 dark:text-neutral-400">
                  {matches.length > shown.length
                    ? `Showing ${shown.length} of ${matches.length}. Search to find someone else.`
                    : picked && !shown.includes(picked)
                      ? `${fullName(picked)} is selected.`
                      : ""}
                </p>
              </>
            )}
          </div>

          <DialogFooter className="border-t border-slate-300 bg-slate-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-950/50">
            <Button
              type="button"
              variant="cancel"
              onClick={closeAdd}
              disabled={addTeamMemberMutationPending}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={addTeamMemberMutationPending || !newMemberId}
              onClick={handleAddTeamMember}
              className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover disabled:opacity-50"
            >
              {addTeamMemberMutationPending && <Spinner className="size-3.5" />}
              {addTeamMemberMutationPending ? "Adding" : "Add member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={removeTarget !== null}
        title="Remove from the team?"
        description={
          <>
            <ConfirmDeleteName>{removeTarget ? fullName(removeTarget) : ""}</ConfirmDeleteName> will no longer see
            this job or its candidates, unless they are a Super Admin. Their notes and scorecards are kept.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing"
        isPending={removeTeamMemberMutation.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
