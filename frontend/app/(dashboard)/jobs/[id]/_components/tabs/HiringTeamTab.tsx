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

interface HiringTeamTabProps {
  team: User[];
  allUsers: User[];
  addTeamMemberOpen: boolean;
  setAddTeamMemberOpen: (open: boolean) => void;
  newMemberId: string;
  setNewMemberId: (id: string) => void;
  newMemberRole: string;
  setNewMemberRole: (role: string) => void;
  handleAddTeamMember: () => void;
  addTeamMemberMutationPending: boolean;
  removeTeamMemberMutation: any;
}

const MEMBER_ROLE_LABELS: Record<string, string> = {
  hiring_manager: "Hiring Manager",
  interviewer: "Interviewer",
  recruiter: "Recruiter",
};

export function HiringTeamTab({
  team,
  allUsers,
  addTeamMemberOpen,
  setAddTeamMemberOpen,
  newMemberId,
  setNewMemberId,
  newMemberRole,
  setNewMemberRole,
  handleAddTeamMember,
  addTeamMemberMutationPending,
  removeTeamMemberMutation,
}: HiringTeamTabProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-4">
          <span className="text-slate-500 dark:text-neutral-400 font-medium text-[15px]">
            Team Members
          </span>
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
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Assign a user to this job&apos;s hiring team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Select User</Label>
                  <Select
                    value={newMemberId}
                    onValueChange={(value) => setNewMemberId(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user">
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
                    <SelectContent>
                      {allUsers
                        .filter((u) => !team.some((t) => t.id === u.id))
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.firstName} {u.lastName} ({u.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Role Context</Label>
                  <Select
                    value={newMemberRole}
                    onValueChange={(value) =>
                      setNewMemberRole(value ?? "hiring_manager")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {MEMBER_ROLE_LABELS[newMemberRole] ?? newMemberRole}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hiring_manager">
                        Hiring Manager
                      </SelectItem>
                      <SelectItem value="interviewer">Interviewer</SelectItem>
                      <SelectItem value="recruiter">Recruiter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setAddTeamMemberOpen(false)}
                  className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600"
                >
                  Cancel
                </Button>
                <Button
                  disabled={addTeamMemberMutationPending}
                  onClick={handleAddTeamMember}
                  className="h-[34px] rounded-md border-none bg-[var(--theme-color)] px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                >
                  {addTeamMemberMutationPending ? "Adding..." : "Add Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <button
                onClick={() => removeTeamMemberMutation.mutate(member.id)}
                disabled={removeTeamMemberMutation.isPending}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Remove Member"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
