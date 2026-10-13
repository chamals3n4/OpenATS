"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
  changePasswordErrorMessage,
  validateNewPassword,
} from "@/lib/auth-errors";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

/** One line under a field that turns green once what it asks for is true. */
function Check({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <p
      className={`flex items-center gap-1.5 text-xs ${
        met ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-neutral-400"
      }`}
    >
      <HugeiconsIcon
        icon={Tick02Icon}
        strokeWidth={2.5}
        aria-hidden
        className={`size-3.5 shrink-0 ${met ? "" : "opacity-30"}`}
      />
      {children}
    </p>
  );
}

/**
 * The password section of the profile. It is closed until asked for: most visits to the profile
 * are not to change a password, and three empty password boxes make the page look like a form
 * that has to be filled in.
 */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    const invalid = validateNewPassword(newPassword, confirmation);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        // Signs out every other device, in case the old password was known.
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError(changePasswordErrorMessage(result.error));
        return;
      }

      toast.success("Password changed. Your other sessions were signed out.");
      close();
    } catch {
      setError(changePasswordErrorMessage(null));
    } finally {
      setSubmitting(false);
    }
  };

  const longEnough = newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= PASSWORD_MAX_LENGTH;
  const matches = confirmation.length > 0 && confirmation === newPassword;

  return (
    <section
      aria-labelledby="change-password-heading"
      className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <div className="min-w-0">
          <h2
            id="change-password-heading"
            className="text-base font-semibold text-slate-900 dark:text-neutral-100"
          >
            Password
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            {open
              ? "You stay signed in here. Every other device is signed out."
              : "The password you sign in to OpenATS with."}
          </p>
        </div>
        {!open && (
          <Button
            type="button"
            variant="cancel"
            onClick={() => setOpen(true)}
            className="h-9 cursor-pointer px-4 text-sm"
          >
            Change password
          </Button>
        )}
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="border-t border-slate-300 dark:border-neutral-700"
        >
          <div className="max-w-2xl px-6 py-6">
            <FieldGroup>
              <FormAlert message={error} />

              <Field className="sm:max-w-sm">
                <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                <PasswordInput
                  id="current-password"
                  name="current-password"
                  autoComplete="current-password"
                  autoFocus
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={submitting}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="profile-new-password">New password</FieldLabel>
                  <PasswordInput
                    id="profile-new-password"
                    name="new-password"
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                    aria-describedby="profile-password-rule"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <FieldDescription id="profile-password-rule">
                    <Check met={longEnough}>{PASSWORD_RULE}</Check>
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="profile-confirm-password">
                    Confirm new password
                  </FieldLabel>
                  <PasswordInput
                    id="profile-confirm-password"
                    name="confirm-password"
                    autoComplete="new-password"
                    aria-describedby="profile-password-match"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    disabled={submitting}
                  />
                  <FieldDescription id="profile-password-match">
                    <Check met={matches}>Both passwords are the same.</Check>
                  </FieldDescription>
                </Field>
              </div>
            </FieldGroup>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-neutral-800 dark:bg-neutral-950/50">
            <Button
              type="button"
              variant="cancel"
              onClick={close}
              disabled={submitting}
              className="h-9 cursor-pointer px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 cursor-pointer gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
            >
              {submitting ? <Spinner className="size-3.5" /> : null}
              Update password
            </Button>
          </footer>
        </form>
      )}
    </section>
  );
}
