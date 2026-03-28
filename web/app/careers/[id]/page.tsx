//details of specific job opening

"use client";

import { useRef, useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Briefcase01Icon,
  Location01Icon,
  Wallet01Icon,
  CloudUploadIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

//jobdetails and the questions to evaluate the candidate
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

type Answer = { answerText?: string; optionIds?: number[] };

export default function JobApplicationPage() {
  const params = useParams();
  const jobId = Number(params.id);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+94");
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

  useEffect(() => {
    if (!jobId) return;
    Promise.all([
      publicFetch<{ data: JobDetail }>(`/jobs/${jobId}`),
      publicFetch<{ data: CustomQuestion[] }>(`/jobs/${jobId}/questions`),
    ])
      .then(([jobRes, qRes]) => {
        setJob(jobRes.data);
        setQuestions(qRes.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

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
      await publicFetch(`/jobs/${jobId}/apply`, {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phoneNumber ? `${phoneCode} ${phoneNumber}` : undefined,
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-neutral-900 flex flex-col items-center pt-32 pb-12 px-4 transition-colors duration-300">
        <div className="bg-white dark:bg-neutral-950 p-10 rounded-2xl shadow-sm border border-slate-300 dark:border-neutral-800 text-center max-w-md w-full">
          <div className="size-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="size-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100 mb-2">
            Application Submitted!
          </h2>
          <p className="text-slate-500 dark:text-neutral-400 mb-8 leading-relaxed">
            Thank you for applying to{" "}
            <strong className="text-slate-700 dark:text-neutral-200">
              {job?.title}
            </strong>
            . We are reviewing your application and will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-slate-400 dark:text-neutral-600 text-sm font-medium animate-pulse">
          Loading job…
        </p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-6">
        <p className="text-red-500 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          {error ?? "Job not found."}
        </p>
      </div>
    );
  }

  const salary = formatSalary(job);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-[800px] mx-auto pt-16 pb-24 px-6 sm:px-8">
        <Link
          href="#"
          className="flex items-center gap-2 text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 text-sm font-medium mb-10 w-fit transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          <span>Back to jobs</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-6">
          <h1 className="text-3xl sm:text-[32px] font-semibold text-slate-900 dark:text-neutral-100 leading-tight">
            {job.title}
          </h1>
          <Button
            onClick={() =>
              document
                .getElementById("apply-form")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="bg-[#F97316] hover:bg-[#EA580C] text-white px-8 h-10 rounded-[6px] shadow-none font-medium shrink-0 w-full sm:w-auto text-[15px]"
          >
            Apply
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-12 text-[14px] text-slate-500 dark:text-neutral-400">
          {job.employmentType && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Briefcase01Icon}
                className="size-[18px] text-slate-400 dark:text-neutral-500"
              />
              <span className="font-medium">
                {EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}
              </span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Location01Icon}
                className="size-[18px] text-slate-400 dark:text-neutral-500"
              />
              <span className="font-medium">{job.location}</span>
            </div>
          )}
          {salary && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Wallet01Icon}
                className="size-[18px] text-slate-400 dark:text-neutral-500"
              />
              <span className="font-medium">{salary}</span>
            </div>
          )}
        </div>

        {job.description && (
          <div
            className="text-slate-600 dark:text-neutral-300 text-[15px] leading-[1.45] [&_p]:m-0 [&_p+p]:mt-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-slate-900 dark:[&_h1]:text-neutral-100 [&_h1]:m-0 [&_h1+p]:mt-1.5 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-neutral-100 [&_h2]:m-0 [&_h2+p]:mt-1.5 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-slate-800 dark:[&_h3]:text-neutral-200 [&_h3]:m-0 [&_h3+p]:mt-1"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        )}

        <div className="my-14 border-t border-slate-100 dark:border-neutral-800" />

        <div id="apply-form">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-8">
            Apply for this job
          </h2>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                aria-invalid={!!emailError}
                className={`h-11 bg-white dark:bg-neutral-900 rounded-md shadow-none focus-visible:ring-0 text-slate-900 dark:text-neutral-100 ${
                  emailError
                    ? "border-2 border-red-500 focus-visible:border-red-500 dark:border-red-500"
                    : "border border-slate-300 dark:border-neutral-800 focus-visible:border-[#F97316]"
                }`}
              />
              {emailError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">
                Phone
              </Label>
              <div className="flex gap-3">
                <Select
                  value={phoneCode}
                  onValueChange={(val) => setPhoneCode(val || "+94")}
                >
                  <SelectTrigger className="w-[100px] h-11! bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-800 shadow-none rounded-md focus:ring-0 text-slate-900 dark:text-neutral-100">
                    <SelectValue placeholder="+94" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md border-slate-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md min-w-[100px]">
                    <SelectItem value="+94">+94</SelectItem>
                    <SelectItem value="+1">+1</SelectItem>
                    <SelectItem value="+44">+44</SelectItem>
                    <SelectItem value="+91">+91</SelectItem>
                    <SelectItem value="+61">+61</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-neutral-300 text-[14px] flex items-center justify-between">
                Resume / CV
                <span className="text-slate-400 dark:text-neutral-500 font-normal text-xs">
                  (Optional)
                </span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleResumeChange(file);
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleResumeChange(file);
                }}
                className="h-[120px] w-full rounded-xl border border-dashed border-slate-300 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 hover:bg-slate-50 dark:hover:bg-neutral-900 hover:border-slate-300 dark:hover:border-neutral-700 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-400 dark:text-neutral-600 group select-none"
              >
                {resumeUploading ? (
                  <>
                    <div className="size-5 border-2 border-slate-300 dark:border-neutral-700 border-t-[#F97316] rounded-full animate-spin" />
                    <span className="text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                      Uploading…
                    </span>
                  </>
                ) : resumeUrl ? (
                  <>
                    <svg
                      className="size-6 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-[13px] font-medium text-green-600 max-w-[260px] truncate px-4 text-center">
                      {resumeFile?.name}
                    </span>
                    <span className="text-[12px] text-slate-400">
                      Click to replace
                    </span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={CloudUploadIcon}
                      className="size-6 group-hover:text-slate-500 dark:group-hover:text-neutral-400 transition-colors"
                    />
                    <span className="text-[13px] font-medium group-hover:text-slate-600 dark:group-hover:text-neutral-300 text-slate-500 dark:text-neutral-400">
                      Click or drag to upload your resume
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-neutral-600">
                      PDF, DOC, DOCX · max 10 MB
                    </span>
                  </>
                )}
              </div>
              {resumeError && (
                <p className="text-red-500 text-[12px]">{resumeError}</p>
              )}
            </div>

            {questions.length > 0 && (
              <>
                <div className="pt-6">
                  <div className="space-y-6">
                    {questions.map((q) => (
                      <div key={q.id} className="space-y-2.5">
                        <Label className="text-slate-700 dark:text-neutral-300 text-[14px] font-medium">
                          {q.title}
                          {q.isRequired && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </Label>

                        {q.questionType === "short_answer" && (
                          <Input
                            required={q.isRequired}
                            value={answers[q.id]?.answerText ?? ""}
                            onChange={(e) =>
                              setTextAnswer(q.id, e.target.value)
                            }
                            className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                          />
                        )}

                        {q.questionType === "long_answer" && (
                          <textarea
                            required={q.isRequired}
                            value={answers[q.id]?.answerText ?? ""}
                            onChange={(e) =>
                              setTextAnswer(q.id, e.target.value)
                            }
                            rows={4}
                            className="w-full rounded-md border border-slate-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-slate-700 dark:text-neutral-300 focus:outline-none focus:border-[#F97316] resize-none transition-colors"
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
                                    className="size-4 border-slate-300 data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                                  />
                                  <Label
                                    htmlFor={`q${q.id}-opt${opt.id}`}
                                    className="text-slate-600 text-[14px] cursor-pointer font-normal"
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
                                  className="border-slate-300 dark:border-neutral-700 data-checked:bg-[#F97316] data-checked:border-[#F97316]"
                                />
                                <Label
                                  htmlFor={`q${q.id}-opt${opt.id}`}
                                  className="text-slate-600 dark:text-neutral-400 text-[14px] cursor-pointer font-normal"
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
                </div>
              </>
            )}

            {submitError && (
              <p className="text-red-500 text-sm">{submitError}</p>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                disabled={submitting || resumeUploading}
                className="bg-[#F97316] hover:bg-[#EA580C] text-white px-10 h-12 rounded-[6px] shadow-none font-medium text-[15px] min-w-[180px] disabled:opacity-60"
              >
                {submitting
                  ? "Submitting…"
                  : resumeUploading
                    ? "Uploading resume…"
                    : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-24 pt-8 text-center flex items-center justify-center gap-2 w-full text-slate-500 dark:text-neutral-400 text-sm border-t border-slate-100 dark:border-neutral-800">
          <span>Powered by</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-neutral-200">
            <div className="size-5 rounded-full bg-green-500 flex items-center justify-center">
              <div className="size-2.5 border-2 border-white rounded-full bg-transparent" />
            </div>
            OpenATS
          </div>
        </div>
      </div>
    </div>
  );
}
