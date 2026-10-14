"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/queries/use-user";
import {
  useManagedUsers,
  useRemoveUser,
  useSendPasswordResetLink,
} from "@/hooks/queries/use-user-management";
import type { User } from "@/types";
import { UsersTable } from "./users-table";
import { CreateUserSheet } from "./create-user-sheet";
import { EditUserDialog } from "./edit-user-dialog";
import { SetPasswordDialog } from "./set-password-dialog";
import { getDisplayName } from "../_lib/user-utils";

export function UserManagementClient({
  inviteEmailEnabled,
}: {
  // False when the server has no email provider configured
  inviteEmailEnabled: boolean;
}) {
  const { data: currentUserRes } = useCurrentUser();
  const currentUserId = currentUserRes?.data?.id;

  const { data: users = [], isLoading } = useManagedUsers();
  const removeMutation = useRemoveUser();
  const resetLinkMutation = useSendPasswordResetLink();

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => getDisplayName(u).toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [query, users]);

  const sendResetLink = (u: User) =>
    resetLinkMutation.mutate(u.id, {
      onSuccess: () => toast.success(`Password reset link sent to ${u.email}`),
      onError: (e) => toast.error(e.message || "Failed to send the reset link"),
    });

  const removeUser = () => {
    if (!removeTarget) return;
    removeMutation.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success("User removed");
        setRemoveTarget(null);
      },
      onError: (e) => toast.error(e.message || "Failed to remove user"),
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-6 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-medium text-slate-900 dark:text-neutral-100 leading-none">
          User Management
        </h1>
      </div>

      <div className="border-b border-slate-300 dark:border-neutral-700 px-6 py-2.5 flex items-center gap-2">
        <div className="relative w-64">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search User"
            className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0"
          />
        </div>
        <Button
          onClick={() => setQuery("")}
          className="ml-2 h-8 rounded-md border border-slate-300 dark:border-neutral-600 bg-transparent hover:bg-slate-50 dark:hover:bg-neutral-900/50 px-4 text-sm font-semibold leading-none text-slate-700 dark:text-neutral-300 shadow-none cursor-pointer"
        >
          Clear All
        </Button>
        <div className="ml-auto">
          <Button
            className="h-8 rounded-md border-none bg-[var(--theme-color)] px-4 text-sm font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)] cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2.5} />
            <span>Create User</span>
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <UsersTable
          users={filteredUsers}
          loading={isLoading}
          currentUserId={currentUserId}
          inviteEmailEnabled={inviteEmailEnabled}
          onEdit={setEditUser}
          onRemove={setRemoveTarget}
          onSendResetLink={sendResetLink}
          onSetPassword={setPasswordTarget}
        />
      </div>

      <CreateUserSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        inviteEmailEnabled={inviteEmailEnabled}
      />
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
      <SetPasswordDialog user={passwordTarget} onClose={() => setPasswordTarget(null)} />

      <ConfirmDeleteDialog
        open={!!removeTarget}
        title="Remove this user?"
        description={
          removeTarget ? (
            <>
              <ConfirmDeleteName>{getDisplayName(removeTarget)}</ConfirmDeleteName> will be signed
              out and will no longer be able to sign in. Their history is kept, and creating a user
              with the same email restores the account.
            </>
          ) : (
            "Are you sure?"
          )
        }
        confirmLabel="Remove"
        pendingLabel="Removing"
        isPending={removeMutation.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeUser}
      />
    </div>
  );
}
