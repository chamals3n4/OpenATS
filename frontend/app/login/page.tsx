"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { signInErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormAlert } from "@/components/auth/form-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DemoCredentials } from "./_components/demo-credentials";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await authClient.signIn.email({ email, password });
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
    <>
      <AuthShell title="Sign in to OpenATS">
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

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm text-theme hover:underline underline-offset-3"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </Field>

            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Spinner /> : null}
              Sign in
            </Button>
          </FieldGroup>
        </form>
      </AuthShell>
      <DemoCredentials />
    </>
  );
}
