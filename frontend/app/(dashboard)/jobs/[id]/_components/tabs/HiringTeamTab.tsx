"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { User } from "@/types";
import type { useRemoveHiringTeamMember } from "@/hooks/queries/use-jobs";
import { useIsManager } from "@/hooks/use-role";

interface HiringTeamTabProps {
  team: User[];
  allUsers: User[];
  addTeamMemberOpen: boolean;
  setAddTeamMemberOpen: (open: boolean) => void;
  newMemberId: string;
  setNewMemberId: (id: string) => void;
  handleAddTeamMember: () => void;
  addTeamMemberMutationPending: boolean;
  removeTeamMemberMutation: ReturnType<typeof useRemoveHiringTeamMember>;
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
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 dark:text-neutral-400 font-medium text-[15px]">
            Team Members
          </span>
          {isManager && (
          <Dialog open={addTeamMemberOpen} onOpenChange={setAddTeamMemberOpen}>
            <DialogTrigger
              render={
                <button className="flex items-center cursor-pointer gap-2 text-theme hover:underline font-medium text-[14px]" />
              }
            >
              <HugeiconsIcon
                icon={PlusSignIcon}
                className="size-3.5"
                strokeWidth={3}
              />
              <span>Add New Member</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Assign a user to this job&apos;s hiring team.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-5 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-neutral-300">
                    Select User
                  </Label>
                  <Select
                    value={newMemberId}
                    onValueChange={(value) => setNewMemberId(value ?? "")}
                  >
                    <SelectTrigger className="w-full h-10 rounded-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-none focus:ring-0 text-sm">
                      <SelectValue placeholder="Select a user…">
                        {newMemberId
                          ? (() => {
                              const u = allUsers.find(
                                (u) => u.id.toString() === newMemberId,
                              );
                              return u ? `${u.firstName} ${u.lastName}` : null;
                            })()
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-700">
                      {allUsers
                        .filter((u) => !team.some((t) => t.id === u.id))
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()} className="text-sm">
                            {u.firstName} {u.lastName}
                            <span className="ml-1.5 text-slate-400 dark:text-neutral-500 capitalize text-xs">
                              · {u.role?.replace(/_/g, " ")}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-2 gap-2">
                <Button
                  onClick={() => setAddTeamMemberOpen(false)}
                  className="h-9 rounded-lg border-none bg-neutral-100 dark:bg-neutral-800 px-5 text-[13px] font-semibold text-slate-700 dark:text-neutral-300 shadow-none hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  Cancel
                </Button>
                <Button
                  disabled={addTeamMemberMutationPending || !newMemberId}
                  onClick={handleAddTeamMember}
                  className="h-9 rounded-lg border-none bg-[var(--theme-color)] px-5 text-[13px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-50"
                >
                  {addTeamMemberMutationPending ? "Adding…" : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {team.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No members assigned to this job.
          </p>
        ) : (
          team.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.firstName}
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-11 rounded-full bg-[var(--theme-color)] flex items-center justify-center text-white font-medium text-sm overflow-hidden">
                    {member.firstName.charAt(0)}
                    {member.lastName.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-slate-700 dark:text-neutral-300 font-medium text-[15px]">
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                    {member.role?.replace("_", " ")}
                  </span>
                </div>
              </div>
              {isManager && (
                <button
                  onClick={() => removeTeamMemberMutation.mutate(member.id)}
                  disabled={removeTeamMemberMutation.isPending}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="Remove Member"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
