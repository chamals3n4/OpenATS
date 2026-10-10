"use client";

import { useState } from "react";
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

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      toast.success("Password changed. Your other sessions were signed out.");
    } catch {
      setError(changePasswordErrorMessage(null));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="change-password-heading"
      className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="border-b border-slate-300 px-6 py-4 dark:border-neutral-700">
        <h2
          id="change-password-heading"
          className="text-base font-semibold text-slate-900 dark:text-neutral-100"
        >
          Change password
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          You stay signed in here. Every other device is signed out.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="max-w-md px-6 py-5">
        <FieldGroup>
          <FormAlert message={error} />

          <Field>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <PasswordInput
              id="current-password"
              name="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting}
            />
          </Field>

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
              {PASSWORD_RULE}
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
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <div>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner /> : null}
              Change password
            </Button>
          </div>
        </FieldGroup>
      </form>
    </section>
  );
}
