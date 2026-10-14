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
import { Label } from "@/components/ui/label";
import { useSetUserPassword } from "@/hooks/queries/use-user-management";
import { isValidPassword } from "@/lib/users/rules";
import type { User } from "@/types";
import { PasswordField } from "./password-field";
import { getDisplayName, labelCls, PASSWORD_LENGTH_RULE } from "../_lib/user-utils";

// User to set a password for, null when closed
export function SetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const setPasswordMutation = useSetUserPassword();

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => !open && !setPasswordMutation.isPending && onClose()}
    >
      <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Set new password
          </DialogTitle>
        </DialogHeader>

        {/* Keyed so the password resets for each user */}
        {user && (
          <SetPasswordForm
            key={user.id}
            user={user}
            isPending={setPasswordMutation.isPending}
            onSave={(password) =>
              setPasswordMutation.mutate(
                { id: user.id, password },
                {
                  onSuccess: () => {
                    toast.success("Password updated. The user has been signed out.");
                    onClose();
                  },
                  onError: (e) => toast.error(e.message || "Failed to set the password"),
                },
              )
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordForm({
  user,
  isPending,
  onSave,
}: {
  user: User;
  isPending: boolean;
  onSave: (password: string) => void;
}) {
  const [password, setPassword] = useState("");

  const submit = () => {
    if (!isValidPassword(password)) {
      toast.error(`Password: ${PASSWORD_LENGTH_RULE.toLowerCase()}.`);
      return;
    }
    onSave(password);
  };

  return (
    <>
      <div>
        <p className="mb-4 text-sm text-slate-600 dark:text-neutral-400">
          {getDisplayName(user)} will be signed out everywhere and must use this password to sign
          in. Share it with them yourself: it is not emailed.
        </p>
        <Label htmlFor="new-user-password" className={labelCls}>
          New password *
        </Label>
        <PasswordField
          id="new-user-password"
          value={password}
          onChange={setPassword}
          revealOnGenerate
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-500">{PASSWORD_LENGTH_RULE}</p>
      </div>

      <DialogFooter className="gap-2">
        <DialogClose
          disabled={isPending}
          className="h-9 px-5 rounded-lg border cursor-pointer border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-neutral-800"
        >
          Cancel
        </DialogClose>
        <Button
          onClick={submit}
          disabled={isPending}
          className="h-9 px-5 cursor-pointer rounded-lg text-white text-sm font-semibold shadow-none border-none"
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          {isPending ? "Saving…" : "Set password"}
        </Button>
      </DialogFooter>
    </>
  );
}
