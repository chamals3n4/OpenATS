"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateManagedUser } from "@/hooks/queries/use-user-management";
import type { UpdateUserPayload } from "@/lib/users/client";
import type { User } from "@/types";
import { inputCls, labelCls, ROLES, type Role } from "../_lib/user-utils";

// User to edit, null when closed
export function EditUserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const updateMutation = useUpdateManagedUser();

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && !updateMutation.isPending && onClose()}>
      <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Edit user
          </DialogTitle>
        </DialogHeader>

        {/* Keyed so the fields reset for each user */}
        {user && (
          <EditUserForm
            key={user.id}
            user={user}
            isPending={updateMutation.isPending}
            onSave={(data) =>
              updateMutation.mutate(
                { id: user.id, data },
                {
                  onSuccess: () => {
                    toast.success("User updated");
                    onClose();
                  },
                  onError: (e) => toast.error(e.message || "Failed to update user"),
                },
              )
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  isPending,
  onSave,
}: {
  user: User;
  isPending: boolean;
  onSave: (data: UpdateUserPayload) => void;
}) {
  const [form, setForm] = useState<UpdateUserPayload>(() => ({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    role: user.role ?? "interviewer",
  }));
  const role = (form.role ?? "interviewer") as Role;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={labelCls}>First name</Label>
          <Input
            value={form.firstName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div>
          <Label className={labelCls}>Last name</Label>
          <Input
            value={form.lastName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <Label className={labelCls}>Email</Label>
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <Label className={labelCls}>Role</Label>
          <Select value={role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
            <SelectTrigger className="w-full h-10! rounded-lg bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none px-3! py-0! focus-visible:ring-2 focus-visible:ring-theme focus-visible:border-theme">
              <SelectValue placeholder="Select role">
                {ROLES.find((r) => r.value === role)?.label ?? null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <DialogClose
          disabled={isPending}
          className="h-9 px-5 rounded-lg border cursor-pointer border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-neutral-800"
        >
          Cancel
        </DialogClose>
        <Button
          onClick={() => onSave(form)}
          disabled={isPending}
          className="h-9 px-5 cursor-pointer rounded-lg text-white text-sm font-semibold shadow-none border-none"
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
