"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, MailSend01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth-client";
import { isRateLimited, signInErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormAlert } from "@/components/auth/form-alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function BackToSignIn() {
  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
      Back to sign in
    </Link>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      // Only throttling is reported. Every other outcome shows the same
      // confirmation, so the page never reveals whether the email exists.
      if (isRateLimited(result.error)) {
        setError(signInErrorMessage(result.error));
      } else {
        setSent(true);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        description="If an account exists for that email, we have sent a link to reset your password. The link expires in 1 hour."
      >
        <div className="flex flex-col items-center gap-6">
          <HugeiconsIcon
            icon={MailSend01Icon}
            className="size-10 text-theme"
            strokeWidth={1.5}
          />
          <BackToSignIn />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we will send you a link to reset it."
    >
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <FormAlert message={error} />

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            Send reset link
          </Button>

          <BackToSignIn />
        </FieldGroup>
      </form>
    </AuthShell>
  );
}
