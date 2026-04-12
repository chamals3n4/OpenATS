import { JobApplicationForm } from "./job-application-form";
import type { JobDetail, CustomQuestion } from "@/types";

const API_BASE = (
  process.env.OPENATS_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
).replace(/\/$/, "");

async function getJob(id: number): Promise<JobDetail | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/public/jobs/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: JobDetail };
    return body.data ?? null;
  } catch {
    return null;
  }
}

async function getQuestions(id: number): Promise<CustomQuestion[]> {
  if (!API_BASE) return [];
  try {
    const res = await fetch(`${API_BASE}/public/jobs/${id}/questions`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: CustomQuestion[] };
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export default async function JobApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jobId = Number(id);

  const [job, questions] = await Promise.all([
    getJob(jobId),
    getQuestions(jobId),
  ]);

  if (!job) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center p-6">
        <p className="text-red-500 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          Job not found.
        </p>
      </div>
    );
  }

<<<<<<< HEAD
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
              document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" })
            }
            className="bg-[#F97316] hover:bg-[#EA580C] text-white px-8 h-10 rounded-[6px] shadow-none font-medium shrink-0 w-full sm:w-auto text-[15px]"
          >
            Apply
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-12 text-[14px] text-slate-500 dark:text-neutral-400">
          {job.employmentType && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Briefcase01Icon} className="size-[18px] text-slate-400 dark:text-neutral-500" />
              <span className="font-medium">{EMPLOYMENT_LABELS[job.employmentType] ?? job.employmentType}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Location01Icon} className="size-[18px] text-slate-400 dark:text-neutral-500" />
              <span className="font-medium">{job.location}</span>
            </div>
          )}
          {salary && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Wallet01Icon} className="size-[18px] text-slate-400 dark:text-neutral-500" />
              <span className="font-medium">{salary}</span>
            </div>
          )}
        </div>

        {job.description && (
          <div
            className="whitespace-pre-line text-slate-600 dark:text-neutral-300 text-[15px] leading-relaxed space-y-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_h1]:font-bold [&_h1]:text-slate-900 dark:[&_h1]:text-neutral-100 [&_h1]:text-xl [&_h1]:mt-6 [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:text-neutral-100 [&_h2]:text-[17px] [&_h2]:mt-6 [&_h3]:font-medium [&_h3]:text-slate-800 dark:[&_h3]:text-neutral-200"
            dangerouslySetInnerHTML={{ __html: job.description }}
          />
        )}

        <div className="my-14 border-t border-slate-100 dark:border-neutral-800" />

        <div id="apply-form">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-neutral-100 mb-8">Apply for this job</h2>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">First Name <span className="text-red-500">*</span></Label>
                <Input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-neutral-300 text-[14px]">Phone</Label>
              <div className="flex gap-3">
                <Select value={phoneCode} onValueChange={(val) => setPhoneCode(val || "+94")}>
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
                <span className="text-slate-400 dark:text-neutral-500 font-normal text-xs">(Optional)</span>
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
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
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
                    <span className="text-[13px] font-medium text-slate-500 dark:text-neutral-400">Uploading…</span>
                  </>
                ) : resumeUrl ? (
                  <>
                    <svg className="size-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[13px] font-medium text-green-600 max-w-[260px] truncate px-4 text-center">
                      {resumeFile?.name}
                    </span>
                    <span className="text-[12px] text-slate-400">Click to replace</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={CloudUploadIcon} className="size-6 group-hover:text-slate-500 dark:group-hover:text-neutral-400 transition-colors" />
                    <span className="text-[13px] font-medium group-hover:text-slate-600 dark:group-hover:text-neutral-300 text-slate-500 dark:text-neutral-400">
                      Click or drag to upload your resume
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-neutral-600">PDF, DOC, DOCX · max 10 MB</span>
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
                          {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {q.questionType === "short_answer" && (
                          <Input
                            required={q.isRequired}
                            value={answers[q.id]?.answerText ?? ""}
                            onChange={(e) => setTextAnswer(q.id, e.target.value)}
                            className="h-11 bg-white dark:bg-neutral-900 rounded-md border-slate-300 dark:border-neutral-800 shadow-none focus-visible:ring-0 focus-visible:border-[#F97316] text-slate-900 dark:text-neutral-100"
                          />
                        )}

                        {q.questionType === "long_answer" && (
                          <textarea
                            required={q.isRequired}
                            value={answers[q.id]?.answerText ?? ""}
                            onChange={(e) => setTextAnswer(q.id, e.target.value)}
                            rows={4}
                            className="w-full rounded-md border border-slate-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-slate-700 dark:text-neutral-300 focus:outline-none focus:border-[#F97316] resize-none transition-colors"
                          />
                        )}

                        {q.questionType === "checkbox" && q.options.length > 0 && (
                          <div className="space-y-2.5">
                            {q.options.map((opt) => (
                              <div key={opt.id} className="flex items-center gap-3">
                                <Checkbox
                                  id={`q${q.id}-opt${opt.id}`}
                                  checked={answers[q.id]?.optionIds?.includes(opt.id) ?? false}
                                  onCheckedChange={() => toggleCheckbox(q.id, opt.id)}
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
                              <div key={opt.id} className="flex items-center gap-3">
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
                {submitting ? "Submitting…" : resumeUploading ? "Uploading resume…" : "Submit Application"}
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
=======
  return <JobApplicationForm job={job} questions={questions} />;
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
}
