"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { AssignmentBrief, isWebUrl } from "@/components/assignment/assignment-brief";
import { SubmissionFields } from "@/components/assignment/submission-fields";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/format";
import { fetchAssignment, submitAssignment, type PublicAssignment } from "./assignment-api";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-white px-4 py-8 sm:px-6 dark:bg-neutral-950">
      <div className="w-full max-w-3xl rounded-lg border border-slate-300 px-6 py-8 sm:px-10 sm:py-10 dark:border-neutral-700">
        {children}
      </div>
    </main>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">{title}</h1>
      <p className="mt-2 text-[15px] text-slate-600 dark:text-neutral-300">{text}</p>
    </Shell>
  );
}

export function AssignmentClient({ token }: { token: string }) {
  const [assignment, setAssignment] = useState<PublicAssignment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAssignment(token)
      .then((res) => {
        if (cancelled) return;
        setAssignment(res.data);
        setAnswers(res.data.submissionAnswers);
      })
      .catch((error: Error) => !cancelled && setLoadError(error.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loadError) {
    return <Message title="This link doesn't work" text="It may have been typed wrongly. Please use the link from your email." />;
  }
  if (!assignment) {
    return (
      <Shell>
        <Spinner className="size-5" />
      </Shell>
    );
  }

  const due = formatDateTime(assignment.dueAt);
  const closed = assignment.status === "expired" || new Date(assignment.dueAt) < new Date();
  const submitted = assignment.status === "submitted" || justSaved;

  const handleSubmit = async () => {
    for (const field of assignment.submissionFields) {
      const value = (answers[field.id] ?? "").trim();
      if (!value) {
        if (field.required) return setFormError(`${field.label} is required.`);
      } else if (field.type === "link" && !isWebUrl(value)) {
        return setFormError(`${field.label} must start with http:// or https://`);
      }
    }
    setFormError(null);
    setSaving(true);
    try {
      await submitAssignment(token, answers);
      setJustSaved(true);
      setAssignment({ ...assignment, status: "submitted", submittedAt: new Date().toISOString() });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <p className="mb-6 text-[15px] text-slate-700 dark:text-neutral-300">Hello {assignment.firstName},</p>
      <AssignmentBrief
        title={assignment.title}
        description={assignment.description}
        resources={assignment.resources}
        deadline={closed ? `The deadline passed on ${due}` : `Hand in by ${due}`}
      />

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-neutral-800">
        {closed ? (
          <>
            <p className="text-[15px] font-medium text-slate-700 dark:text-neutral-300">
              {submitted
                ? "The deadline has passed, so your submission can no longer be changed. Thank you for handing it in."
                : "This assignment is closed and no longer accepts work. If you need more time, please contact the hiring team."}
            </p>
            {submitted && (
              <dl className="mt-4 space-y-3 text-sm">
                {assignment.submissionFields
                  .filter((field) => answers[field.id])
                  .map((field) => (
                    <div key={field.id}>
                      <dt className="font-medium text-slate-800 dark:text-neutral-200">{field.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-line break-all text-slate-600 dark:text-neutral-300">
                        {answers[field.id]}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Hand in your work</h2>
            {submitted && (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <HugeiconsIcon icon={Tick02Icon} className="size-4" />
                Received. You can change your answer below until {due}.
              </p>
            )}

            <div className="mt-4">
              <SubmissionFields
                fields={assignment.submissionFields}
                values={answers}
                onChange={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
              />
            </div>

            {formError && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{formError}</p>}

            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="mt-4 h-10 gap-2 bg-theme px-5 text-white hover:bg-theme-hover"
            >
              {saving && <Spinner className="size-3.5" />}
              {submitted ? "Update my submission" : "Submit"}
            </Button>
          </>
        )}
      </div>
    </Shell>
  );
}
