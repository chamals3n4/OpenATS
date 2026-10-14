"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormField, inputCls } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { NAME_MAX_LENGTH } from "@/lib/users/rules";

/**
 * The part of a profile its owner may change: their name. The email is shown but not editable,
 * because it is what they sign in with and a super admin sets it.
 */
export function ProfileDetailsForm({
  firstName,
  lastName,
  email,
}: {
  firstName: string;
  lastName: string;
  email: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState({ firstName, lastName });
  const [values, setValues] = useState(saved);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const firstNameError = values.firstName.trim() ? null : "Enter your first name.";
  const isDirty =
    values.firstName.trim() !== saved.firstName.trim() || values.lastName.trim() !== saved.lastName.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    if (firstNameError) return;

    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json().catch(() => ({}))) as {
        data?: { firstName: string; lastName: string };
        error?: string;
      };
      if (!res.ok || !body.data) throw new Error(body.error ?? "Could not save your details.");

      setSaved(body.data);
      setValues(body.data);
      setShowErrors(false);
      toast.success("Your details were saved.");
      // The name is also shown at the top of this page and in the header of every other one.
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="profile-details-heading"
      className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
    >
      <div className="border-b border-slate-300 px-6 py-5 dark:border-neutral-700">
        <h2 id="profile-details-heading" className="text-base font-semibold text-slate-900 dark:text-neutral-100">
          Personal details
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Your name as your team sees it, on candidates, interviews and messages.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
          <FormField
            label="First name"
            htmlFor="profile-first-name"
            required
            error={showErrors ? firstNameError : null}
          >
            <Input
              id="profile-first-name"
              autoComplete="given-name"
              maxLength={NAME_MAX_LENGTH}
              value={values.firstName}
              onChange={(e) => setValues((prev) => ({ ...prev, firstName: e.target.value }))}
              className={inputCls}
            />
          </FormField>
          <FormField label="Last name" htmlFor="profile-last-name">
            <Input
              id="profile-last-name"
              autoComplete="family-name"
              maxLength={NAME_MAX_LENGTH}
              value={values.lastName}
              onChange={(e) => setValues((prev) => ({ ...prev, lastName: e.target.value }))}
              className={inputCls}
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="profile-email"
            hint="You sign in with this address. A super admin can change it in Settings > User management."
            className="sm:col-span-2"
          >
            <Input
              id="profile-email"
              type="email"
              value={email ?? ""}
              readOnly
              aria-readonly
              className={`${inputCls} cursor-not-allowed text-slate-500 dark:text-neutral-400`}
            />
          </FormField>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-neutral-800 dark:bg-neutral-950/50">
          <Button
            type="button"
            variant="cancel"
            onClick={() => {
              setValues(saved);
              setShowErrors(false);
            }}
            disabled={!isDirty || saving}
            className="h-9 px-4 text-sm"
          >
            Discard
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || saving}
            className="h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
          >
            {saving && <Spinner className="size-3.5" />}
            {saving ? "Saving" : "Save changes"}
          </Button>
        </footer>
      </form>
    </section>
  );
}
