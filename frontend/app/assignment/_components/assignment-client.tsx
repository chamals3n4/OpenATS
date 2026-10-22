"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { AssignmentBrief, isWebUrl } from "@/components/assignment/assignment-brief";
import { SubmissionFields } from "@/components/assignment/submission-fields";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/format";
import { ApiError, fetchAssignment, submitAssignment, type PublicAssignment } from "./assignment-api";

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
  // "missing" is a link that does not exist; "failed" is anything that may work on another try.
  const [loadError, setLoadError] = useState<"missing" | "failed" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAssignment(token)
      .then((res) => {
        if (cancelled) return;
        setAssignment(res.data);
        setAnswers(res.data.submissionAnswers);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiError && error.status === 404 ? "missing" : "failed");
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  if (loadError === "missing") {
    return <Message title="This link doesn't work" text="It may have been typed wrongly. Please use the link from your email." />;
  }
  if (loadError === "failed") {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100">We couldn&apos;t load your assignment</h1>
        <p className="mt-2 text-[15px] text-slate-600 dark:text-neutral-300">
          This is usually temporary. Check your connection and try again. Your link is fine.
        </p>
        <Button
          onClick={() => {
            setLoadError(null);
            setAttempt((n) => n + 1);
          }}
          className="mt-4 h-10 bg-theme px-5 text-white hover:bg-theme-hover"
        >
          Try again
        </Button>
      </Shell>
    );
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
  const submitted = assignment.status === "submitted";

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
      setAssignment({ ...assignment, status: "submitted", submittedAt: new Date().toISOString() });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Handed in already, perhaps from another tab: show what was saved
        setAttempt((n) => n + 1);
        return;
      }
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Like a form that has been sent: only the confirmation, not the form again
  if (submitted) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-neutral-950">
        <div className="flex w-full max-w-lg flex-col items-center rounded-xl border border-slate-300 bg-white px-6 py-10 text-center shadow-sm sm:px-10 dark:border-neutral-700 dark:bg-neutral-900">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-8" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-neutral-100">Your work has been submitted</h1>
          <p className="mt-2 text-[15px] font-medium text-slate-700 dark:text-neutral-300">{assignment.title}</p>
          {assignment.submittedAt && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-neutral-400">
              <HugeiconsIcon icon={Clock01Icon} className="size-4" />
              Received {formatDateTime(assignment.submittedAt)}
            </p>
          )}
          <p className="mt-6 max-w-md text-sm text-slate-600 dark:text-neutral-400">
            Thank you, {assignment.firstName}. The hiring team will review it and be in touch. You don&apos;t need to do anything else.
          </p>
        </div>
      </main>
    );
  }

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
          <p className="text-[15px] font-medium text-slate-700 dark:text-neutral-300">
            This assignment is closed and no longer accepts work. If you need more time, please contact the hiring team.
          </p>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Hand in your work</h2>

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
              Submit
            </Button>
            <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
              You can only submit once, so check your answers first.
            </p>
          </>
        )}
      </div>
    </Shell>
  );
}
