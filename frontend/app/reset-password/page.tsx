"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Unlink03Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth-client";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE,
  isInvalidResetToken,
  resetPasswordErrorMessage,
  validateNewPassword,
} from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

function InvalidLink() {
  return (
    <AuthShell
      title="This link is no longer valid"
      description="The link is invalid, has expired, or has already been used. Request a new one to continue."
    >
      <div className="flex flex-col items-center gap-6">
        <HugeiconsIcon
          icon={Unlink03Icon}
          className="size-10 text-muted-foreground"
          strokeWidth={1.5}
        />
        <Link
          href="/forgot-password"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Request a new link
        </Link>
      </div>
    </AuthShell>
  );
}

function PasswordSaved() {
  return (
    <AuthShell
      title="Password saved"
      description="You can now sign in with your new password."
    >
      <div className="flex flex-col items-center gap-6">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="size-10 text-theme"
          strokeWidth={1.5}
        />
        <Link
          href="/login"
          className={buttonVariants({ size: "lg", className: "w-full" })}
        >
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}

// Serves both a password reset and an invited user setting a first password:
// either way the link carries a one-time token.
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // Better Auth redirects here with ?error=INVALID_TOKEN for a bad link.
  const linkError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"form" | "invalid" | "done">("form");

  if (!token || linkError || status === "invalid") return <InvalidLink />;
  if (status === "done") return <PasswordSaved />;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const invalid = validateNewPassword(password, confirmation);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (!result.error) {
        setStatus("done");
      } else if (isInvalidResetToken(result.error)) {
        setStatus("invalid");
      } else {
        setError(resetPasswordErrorMessage(result.error));
      }
    } catch {
      setError(resetPasswordErrorMessage(null));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Set your password"
      description="Choose the password you will use to sign in to OpenATS."
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <FormAlert message={error} />

          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <PasswordInput
              id="new-password"
              name="new-password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              aria-describedby="password-rule"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <FieldDescription id="password-rule">
              {PASSWORD_RULE}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            Save password
          </Button>
        </FieldGroup>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
