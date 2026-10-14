"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCreateUser } from "@/hooks/queries/use-user-management";
import type { CreateUserPayload } from "@/lib/users/client";
import { isValidPassword } from "@/lib/users/rules";
import { PasswordField } from "./password-field";
import {
  inputCls,
  labelCls,
  PASSWORD_LENGTH_RULE,
  ROLES,
  type Role,
} from "../_lib/user-utils";

type PasswordMethod = "invite" | "set";

export function CreateUserSheet({
  open,
  onOpenChange,
  inviteEmailEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // False when the server has no email provider configured
  inviteEmailEnabled: boolean;
}) {
  const createMutation = useCreateUser();

  return (
    <Sheet open={open} onOpenChange={(o) => !createMutation.isPending && onOpenChange(o)}>
      <SheetContent
        side="right"
        className="w-[calc(100vw-2rem)] max-w-[480px] sm:w-[460px] md:w-[520px] p-0 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800"
      >
        <SheetHeader className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800">
          <SheetTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            Create User
          </SheetTitle>
        </SheetHeader>

        {/* Mount only when open so the form resets */}
        {open && (
          <CreateUserForm
            inviteEmailEnabled={inviteEmailEnabled}
            isPending={createMutation.isPending}
            onSubmit={(payload) =>
              createMutation.mutate(payload, {
                onSuccess: (result) => {
                  toast.success(
                    result.reactivated
                      ? "User reactivated"
                      : payload.method === "invite"
                        ? "Invitation sent"
                        : "User created",
                  );
                  onOpenChange(false);
                },
                onError: (e) => toast.error(e.message || "Failed to create user"),
              })
            }
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreateUserForm({
  inviteEmailEnabled,
  isPending,
  onSubmit,
}: {
  inviteEmailEnabled: boolean;
  isPending: boolean;
  onSubmit: (payload: CreateUserPayload) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("interviewer");
  const [password, setPassword] = useState("");
  const [passwordMethod, setPasswordMethod] = useState<PasswordMethod>(
    inviteEmailEnabled ? "invite" : "set",
  );

  const submit = () => {
    if (!email.trim() || !firstName.trim()) {
      toast.error("Email and first name are required.");
      return;
    }
    if (passwordMethod === "set") {
      if (!password) {
        toast.error("Password is required.");
        return;
      }
      if (!isValidPassword(password)) {
        toast.error(`Password: ${PASSWORD_LENGTH_RULE.toLowerCase()}.`);
        return;
      }
    }
    onSubmit({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      method: passwordMethod,
      ...(passwordMethod === "set" ? { password } : {}),
    });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className={labelCls}>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter the email address"
              className={inputCls}
            />
          </div>

          <div>
            <Label className={labelCls}>First name *</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter the first name"
              className={inputCls}
            />
          </div>

          <div>
            <Label className={labelCls}>Last name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter the last name"
              className={inputCls}
            />
          </div>

          <div className="col-span-2">
            <Label className={labelCls}>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-full h-9! rounded-md bg-gray-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 shadow-none px-3! py-0! text-sm focus-visible:ring-0 transition-colors">
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

          <div className="col-span-2 pt-0.5">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-400 mb-3">
              Select the method to set the user password
            </p>
            <RadioGroup
              value={passwordMethod}
              onValueChange={(v) => setPasswordMethod(v as PasswordMethod)}
              className="gap-3"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem
                  id="pw-method-invite"
                  value="invite"
                  disabled={!inviteEmailEnabled}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="pw-method-invite"
                    className={
                      inviteEmailEnabled
                        ? "text-sm font-medium text-slate-800 dark:text-neutral-200 cursor-pointer"
                        : "text-sm font-medium text-slate-400 dark:text-neutral-500 cursor-not-allowed"
                    }
                  >
                    Invite the user to set their own password
                  </Label>
                  {!inviteEmailEnabled && (
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Email sending is not configured on this server, so invitations cannot be
                      sent. Set a password instead.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="pw-method-set" value="set" />
                <Label
                  htmlFor="pw-method-set"
                  className="text-sm font-medium text-slate-800 dark:text-neutral-200 cursor-pointer"
                >
                  Set a password for the user
                </Label>
              </div>
            </RadioGroup>
          </div>

          {passwordMethod === "set" && (
            <div className="col-span-2">
              <Label htmlFor="create-user-password" className={labelCls}>
                Password *
              </Label>
              <PasswordField id="create-user-password" value={password} onChange={setPassword} />
              <div className="flex items-center gap-2 text-xs mt-4">
                <span
                  className={
                    "inline-block size-2 rounded-full " +
                    (isValidPassword(password) ? "bg-theme" : "bg-slate-200 dark:bg-neutral-800")
                  }
                />
                <span
                  className={
                    isValidPassword(password)
                      ? "text-slate-700 dark:text-neutral-300"
                      : "text-slate-500 dark:text-neutral-500"
                  }
                >
                  {PASSWORD_LENGTH_RULE}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <SheetFooter className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end">
        <SheetClose
          render={
            <Button
              variant="ghost"
              disabled={isPending}
              className="h-10 px-4 text-sm shadow-none border-none text-slate-600 dark:text-neutral-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 w-full sm:w-auto"
            />
          }
        >
          Cancel
        </SheetClose>
        <Button
          onClick={submit}
          disabled={isPending}
          className="h-10 px-6 rounded-lg text-white font-semibold text-sm shadow-none border-none w-full sm:w-auto"
          style={{ backgroundColor: "var(--theme-color)" }}
        >
          {isPending ? "Finishing…" : "Finish"}
        </Button>
      </SheetFooter>
    </>
  );
}
