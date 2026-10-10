"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  signInErrorMessage,
  validateSignIn,
  type SignInFieldErrors,
} from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { authInputClass } from "@/components/auth/input-class";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DemoCredentials } from "./_components/demo-credentials";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const invalid = validateSignIn({ email, password });
    setFieldErrors(invalid);
    if (invalid.email || invalid.password) return;

    setSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (result.error) {
        setError(signInErrorMessage(result.error));
        setSubmitting(false);
        return;
      }

      // Stay in the submitting state while the dashboard loads.
      router.push("/");
      router.refresh();
    } catch {
      setError(signInErrorMessage(null));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      description="Use your OpenATS account to continue."
    >
      <div className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} noValidate>
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
                placeholder="you@company.com"
                className={authInputClass}
                aria-invalid={fieldErrors.email ? true : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                aria-invalid={fieldErrors.password ? true : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <FieldError>{fieldErrors.password}</FieldError>
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? <Spinner /> : null}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </FieldGroup>
        </form>

        <DemoCredentials
          onUse={(demoEmail, demoPassword) => {
            setEmail(demoEmail);
            setPassword(demoPassword);
            setError(null);
            setFieldErrors({});
          }}
        />
      </div>
    </AuthShell>
  );
}
