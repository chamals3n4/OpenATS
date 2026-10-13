"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  useResetSystemEmail,
  useSaveSystemEmail,
  useSystemEmails,
  type SystemEmail,
} from "@/hooks/queries/use-templates";
import { useIsManager } from "@/hooks/use-role";
import { TemplateFormHeader } from "./template-form/header";
import { EmailBuilder } from "./template-form/email-builder";
import { AutomaticEmailPreview } from "./automatic-email-preview";
import { VariablesProvider } from "./template-form/email-builder/variables-context";

const BACK = "/templates?tab=automatic";

function Message({ children }: { children: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <p className="text-slate-500 dark:text-neutral-400">{children}</p>
    </div>
  );
}

export function AutomaticEmailClient({ purpose }: { purpose: string }) {
  const { data, isLoading } = useSystemEmails();
  const email = data?.data.find((e) => e.purpose === purpose);

  if (isLoading) return <Message>Loading…</Message>;
  if (!email) return <Message>This automatic email does not exist.</Message>;
  // Keyed, so the form starts again from the saved wording after a reset.
  return <AutomaticEmailForm key={`${email.purpose}-${email.updatedAt ?? "default"}`} email={email} />;
}

function AutomaticEmailForm({ email }: { email: SystemEmail }) {
  const router = useRouter();
  const readOnly = !useIsManager();
  const saveMutation = useSaveSystemEmail();
  const resetMutation = useResetSystemEmail();

  const [subject, setSubject] = useState(email.subject);
  const [bodyHtml, setBodyHtml] = useState(email.bodyHtml);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const subjectError = !subject.trim() ? "Enter a subject." : undefined;
  const bodyError = !bodyHtml.trim() ? "Write a message." : undefined;

  const handleSave = () => {
    if (subjectError || bodyError) {
      setShowErrors(true);
      return;
    }
    saveMutation.mutate(
      { purpose: email.purpose, data: { subject: subject.trim(), bodyHtml } },
      {
        onSuccess: () => {
          toast.success("Changes saved.");
          router.push(BACK);
        },
        onError: (error) => toast.error(error.message || "Could not save the email. Please try again."),
      },
    );
  };

  const handleReset = () =>
    resetMutation.mutate(email.purpose, {
      onSuccess: () => {
        toast.success("Back to the default wording.");
        setConfirmReset(false);
      },
      onError: () => toast.error("Could not reset the email. Please try again."),
    });

  return (
    <VariablesProvider value={[{ heading: "Filled in for each candidate", vars: email.variables }]}>
      <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-950">
        <TemplateFormHeader
          templateType="email"
          mode="edit"
          name={email.label}
          subtitle="Automatic email"
          isPending={saveMutation.isPending}
          onSave={handleSave}
          readOnly={readOnly}
          backHref={BACK}
          actions={
            email.customised ? (
              <Button variant="cancel" onClick={() => setConfirmReset(true)} className="h-9 cursor-pointer px-4 text-sm">
                Reset to default
              </Button>
            ) : undefined
          }
        />

        <div className="flex-1 min-h-0 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)] lg:overflow-hidden">
          <div className="lg:h-full lg:overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-8">
              <div className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">When it is sent</p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">{email.description}</p>
              </div>
              <EmailBuilder
                subject={subject}
                onSubjectChange={setSubject}
                subjectError={showErrors ? (subjectError ?? bodyError) : undefined}
                bodyHtml={bodyHtml}
                onBodyHtmlChange={setBodyHtml}
                readOnly={readOnly}
              />
            </div>
          </div>

          <div className="border-slate-200 lg:h-full lg:overflow-y-auto lg:border-l dark:border-neutral-800">
            <AutomaticEmailPreview purpose={email.purpose} subject={subject} bodyHtml={bodyHtml} />
          </div>
        </div>

        <ConfirmDeleteDialog
          open={confirmReset}
          title="Reset this email?"
          description={`Your wording for "${email.label}" will be replaced by the default. This cannot be undone.`}
          confirmLabel="Reset to default"
          pendingLabel="Resetting"
          isPending={resetMutation.isPending}
          onClose={() => setConfirmReset(false)}
          onConfirm={handleReset}
        />
      </div>
    </VariablesProvider>
  );
}
