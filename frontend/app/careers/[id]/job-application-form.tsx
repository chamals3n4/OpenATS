"use client";

import { useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown02Icon,
  ArrowRight02Icon,
  Upload06Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { JobDetail, CustomQuestion } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type PublicFetchError = Error & { code?: string; status?: number };

async function publicFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}/public${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body as { error?: string; code?: string };
    const message = err.error ?? `HTTP ${res.status}`;
    const e = new Error(message) as PublicFetchError;
    e.code = err.code;
    e.status = res.status;
    throw e;
  }
  return body as T;
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

function formatSalary(job: JobDetail): string | null {
  if (!job.salaryType) return null;
  const fmt = (n: string | null) => (n ? Number(n).toLocaleString() : "");
  const freq = job.payFrequency ? `/${job.payFrequency}` : "";
  if (job.salaryType === "fixed")
    return `${job.currency} ${fmt(job.salaryFixed)}${freq}`;
  return `${job.currency} ${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}${freq}`;
}

const fieldInput =
  "h-11 bg-slate-100 dark:bg-neutral-800/60 border border-slate-300 dark:border-neutral-700 rounded-md shadow-none focus-visible:ring-0 focus-visible:border-slate-900 dark:focus-visible:border-neutral-100 text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500";

type Answer = { answerText?: string; optionIds?: number[] };

export function JobApplicationForm({
  job,
  questions,
}: {
  job: JobDetail;
  questions: CustomQuestion[];
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [answers, setAnswers] = useState<Record<number, Answer>>({});

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const setTextAnswer = (qId: number, text: string) =>
    setAnswers((prev) => ({ ...prev, [qId]: { answerText: text } }));

  const toggleCheckbox = (qId: number, optId: number) =>
    setAnswers((prev) => {
      const current = prev[qId]?.optionIds ?? [];
      const next = current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId];
      return { ...prev, [qId]: { optionIds: next } };
    });

  const setRadio = (qId: number, optId: number) =>
    setAnswers((prev) => ({ ...prev, [qId]: { optionIds: [optId] } }));

  const handleResumeChange = async (file: File) => {
    setResumeFile(file);
    setResumeError(null);
    setResumeUrl(null);
    setResumeUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/public/upload/resume`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }
      const data = (await res.json()) as { data: { url: string } };
      setResumeUrl(data.data.url);
    } catch (e: unknown) {
      setResumeError(e instanceof Error ? e.message : "Upload failed");
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setEmailError(null);

    const customAnswers = questions
      .map((q) => {
        const a = answers[q.id];
        if (!a) return null;
        return {
          questionId: q.id,
          answerText: a.answerText || undefined,
          optionIds: a.optionIds?.length ? a.optionIds : undefined,
        };
      })
      .filter(Boolean);

    try {
      await publicFetch(`/jobs/${job.id}/apply`, {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phoneNumber ? phoneNumber : undefined,
          resumeUrl: resumeUrl ?? undefined,
          customAnswers,
        }),
      });
      setSubmitted(true);
    } catch (e: unknown) {
      const err = e as PublicFetchError;
      if (err.code === "DUPLICATE_APPLICATION") {
        setEmailError(
          err.message ||
            "This email has already been used to apply for this job.",
        );
      } else {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Failed to submit. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const salary = formatSalary(job);
  const metaParts = [
    job.employmentType
      ? (EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType)
      : null,
    job.location,
    salary,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-[720px] mx-auto pt-14 pb-24 px-6 sm:px-8">
        <Link
          href="/careers"
          className="text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 text-sm font-medium transition-colors"
        >
          Careers
        </Link>

        <h1 className="mt-6 text-3xl sm:text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-tight">
          {job.title}
        </h1>

        {metaParts.length > 0 && (
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
            {metaParts.join(" · ")}
          </p>
        )}

        <Button
          type="button"
          onClick={() =>
            document
              .getElementById("apply-form")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 text-white px-5 h-10 shadow-none font-medium text-sm w-fit"
        >
          Apply
          <HugeiconsIcon icon={ArrowDown02Icon} className="size-4" />
        </Button>

        {job.description && (
          <div
            className="mt-10 text-slate-600 dark:text-neutral-300 text-sm leading-[1.45] [&_p]:m-0 [&_p+p]:mt-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-slate-900 dark:[&_h1]:text-neutral-100 [&_h1]:m-0 [&_h1+p]:mt-1.5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-neutral-100 [&_h2]:m-0 [&_h2+p]:mt-1.5 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-800 dark:[&_h3]:text-neutral-200 [&_h3]:m-0 [&_h3+p]:mt-1"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        )}

        <div id="apply-form" className="mt-16">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-neutral-100 mb-8">
            Apply for this role
          </h2>

          {submitted ? (
            <p className="rounded-md bg-slate-100 dark:bg-neutral-800/60 px-4 py-3 text-sm text-slate-700 dark:text-neutral-300">
              Application submitted successfully.
            </p>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-neutral-300 text-sm">
                  Name <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    required
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldInput}
                  />
                  <Input
                    required
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldInput}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-neutral-300 text-sm">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    aria-invalid={!!emailError}
                    className={`${fieldInput} ${
                      emailError
                        ? "border border-red-500 focus-visible:border-red-500"
                        : ""
                    }`}
                  />
                  {emailError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-neutral-300 text-sm">
                    Phone
                  </Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Add country code eg :+94"
                    className={fieldInput}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-neutral-300 text-sm">
                  Resume
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleResumeChange(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 w-full rounded-md border border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800/60 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 text-[13.5px] font-medium text-slate-600 dark:text-neutral-300 cursor-pointer"
                >
                  {resumeUploading ? (
                    "Uploading…"
                  ) : resumeUrl ? (
                    <span className="truncate max-w-[280px]">
                      {resumeFile?.name} — click to replace
                    </span>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Upload06Icon} className="size-4" />
                      Upload file
                    </>
                  )}
                </button>
                {resumeError && (
                  <p className="text-red-500 text-xs">{resumeError}</p>
                )}
              </div>

              {questions.length > 0 && (
                <div className="space-y-6">
                  {questions.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label className="text-slate-700 dark:text-neutral-300 text-sm">
                        {q.title}
                        {q.isRequired && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>

                      {q.questionType === "short_answer" && (
                        <Input
                          required={q.isRequired}
                          value={answers[q.id]?.answerText ?? ""}
                          onChange={(e) => setTextAnswer(q.id, e.target.value)}
                          className={fieldInput}
                        />
                      )}

                      {q.questionType === "long_answer" && (
                        <textarea
                          required={q.isRequired}
                          value={answers[q.id]?.answerText ?? ""}
                          onChange={(e) => setTextAnswer(q.id, e.target.value)}
                          rows={4}
                          className="w-full rounded-md border border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800/60 px-3 py-2.5 text-sm text-slate-700 dark:text-neutral-300 focus:outline-none focus-visible:border-slate-900 dark:focus-visible:border-neutral-100 resize-none transition-colors"
                        />
                      )}

                      {q.questionType === "checkbox" &&
                        q.options.length > 0 && (
                          <div className="space-y-2.5">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className="flex items-center gap-3"
                              >
                                <Checkbox
                                  id={`q${q.id}-opt${opt.id}`}
                                  checked={
                                    answers[q.id]?.optionIds?.includes(
                                      opt.id,
                                    ) ?? false
                                  }
                                  onCheckedChange={() =>
                                    toggleCheckbox(q.id, opt.id)
                                  }
                                  className="size-4 border-slate-300 data-[state=checked]:bg-theme data-[state=checked]:border-theme"
                                />
                                <Label
                                  htmlFor={`q${q.id}-opt${opt.id}`}
                                  className="text-slate-600 text-sm cursor-pointer font-normal"
                                >
                                  {opt.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}

                      {q.questionType === "radio" && q.options.length > 0 && (
                        <RadioGroup
                          value={String(answers[q.id]?.optionIds?.[0] ?? "")}
                          onValueChange={(val) => setRadio(q.id, Number(val))}
                          className="space-y-2.5"
                        >
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="flex items-center gap-3"
                            >
                              <RadioGroupItem
                                value={String(opt.id)}
                                id={`q${q.id}-opt${opt.id}`}
                                className="border-slate-300 dark:border-neutral-700 data-checked:bg-theme data-checked:border-theme"
                              />
                              <Label
                                htmlFor={`q${q.id}-opt${opt.id}`}
                                className="text-slate-600 dark:text-neutral-400 text-sm cursor-pointer font-normal"
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {submitError && (
                <p className="text-red-500 text-sm">{submitError}</p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting || resumeUploading}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 text-white px-6 h-11 shadow-none font-medium text-sm disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Spinner className="size-3.5" />
                      Applying
                    </>
                  ) : resumeUploading ? (
                    <>
                      <Spinner className="size-3.5" />
                      Uploading resume
                    </>
                  ) : (
                    <>
                      Submit application
                      <HugeiconsIcon
                        icon={ArrowRight02Icon}
                        className="size-4"
                      />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
