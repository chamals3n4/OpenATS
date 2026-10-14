"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { LockPasswordIcon, MailSend01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { RowDeleteButton, RowEditButton } from "@/components/table/row-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { TableFooter } from "@/components/table/table-footer";
import type { User } from "@/types";
import { getDisplayName } from "../_lib/user-utils";

interface UsersTableProps {
  users: User[];
  loading: boolean;
  currentUserId: number | undefined;
  inviteEmailEnabled: boolean;
  onEdit: (user: User) => void;
  onRemove: (user: User) => void;
  onSendResetLink: (user: User) => void;
  onSetPassword: (user: User) => void;
}

export function UsersTable({
  users,
  loading,
  currentUserId,
  inviteEmailEnabled,
  onEdit,
  onRemove,
  onSendResetLink,
  onSetPassword,
}: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-none dark:border-neutral-700 dark:bg-neutral-900">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-slate-100/70 dark:bg-neutral-800/60 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60">
            <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
              Name
            </TableHead>
            <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
              Email
            </TableHead>
            <TableHead className="h-11 px-6 font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
              Role
            </TableHead>
            <TableHead className="h-11 px-6 w-44 text-right font-semibold text-slate-900 dark:text-neutral-100 text-[15px]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="p-0">
                <ListSectionSpinner />
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow
                key={u.id}
                className="border-b border-slate-300 dark:border-neutral-700 last:border-0 font-medium hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <TableCell className="h-12 px-6 py-0 font-medium text-slate-900 dark:text-neutral-100">
                  {getDisplayName(u)}
                </TableCell>
                <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal">
                  {u.email}
                </TableCell>
                <TableCell className="h-12 px-6 py-0 text-slate-800 dark:text-neutral-200 font-normal capitalize">
                  {u.role.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="h-12 px-6 py-0" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <RowEditButton onClick={() => onEdit(u)} />
                    <RowDeleteButton
                      disabled={u.id === currentUserId}
                      title={u.id === currentUserId ? "You cannot remove your own account" : undefined}
                      onClick={() => onRemove(u)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`More actions for ${getDisplayName(u)}`}
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" strokeWidth={2} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={!inviteEmailEnabled}
                          onClick={() => onSendResetLink(u)}
                        >
                          <HugeiconsIcon icon={MailSend01Icon} />
                          Send password reset link
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => onSetPassword(u)}>
                          <HugeiconsIcon icon={LockPasswordIcon} />
                          Set new password
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TableFooter isLoading={loading} label="user" count={users.length} />
    </div>
  );
}
