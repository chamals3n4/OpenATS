"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUpRight01Icon,
  SentIcon,
  PencilEdit01Icon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { format } from "date-fns";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CandidateJobFitTab } from "@/components/candidate-job-fit-tab";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  useCandidate,
  useUpdateOffer,
  useUpdateOfferStatus,
  useManualOfferResponse,
  useTemplates,
  useHiringTeam,
  useSendCandidateEmail,
  usePreviewTemplate,
} from "@/hooks/use-api";
import type { CandidateDetail, Offer, TemplateBodyBlock, User } from "@/types";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseDateOnly(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function toDateOnlyValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

const OFFER_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  sent: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  accepted: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
  },
  declined: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
  },
  withdrawn: {
    bg: "bg-slate-50 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
};

const TIME_ZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Colombo",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

type EmailComposerMode = "general" | "interview";

function userDisplayName(u: User) {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n || u.email || `User #${u.id}`;
}

function replacePreviewVars(text: string, context: Record<string, string>) {
  if (!text) return "";
  return text.replace(/\{\{(.+?)\}\}/g, (_match, variable) => {
    const key = String(variable).trim();
    return context[key] ?? "";
  });
}

function templateBlocksToEditableText(blocks: TemplateBodyBlock[]) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
        case "text":
          return block.content;
        case "button":
          return `${block.label}\n${block.url}`;
        case "image":
          return block.url ? `[Image] ${block.url}` : "[Image]";
        case "divider":
          return "---";
        case "spacer":
          return "";
        default:
          return "";
      }
    })
    .join("\n\n")
    .trim();
}

function DatePickerField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  className?: string;
}) {
  const selectedDate = parseDateOnly(value);
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "h-10 w-full rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-left text-[13px] shadow-none focus-visible:outline-none focus-visible:ring-0",
          !selectedDate && "text-slate-400 dark:text-neutral-500",
          selectedDate && "text-slate-700 dark:text-neutral-300",
          className,
        )}
      >
        {selectedDate ? format(selectedDate, "MMM dd, yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-slate-200 dark:border-neutral-800"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? toDateOnlyValue(date) : "")}
        />
      </PopoverContent>
    </Popover>
  );
}

function SidePanelEmailTab({
  candidate,
  active,
}: {
  candidate: CandidateDetail;
  active: boolean;
}) {
  const { data: templatesRes } = useTemplates();
  const { data: hiringTeamRes } = useHiringTeam(candidate.jobId, {
    enabled: active,
  });
  const sendCandidateEmailMutation = useSendCandidateEmail();
  const templates = templatesRes?.data ?? [];
  const hiringTeam: User[] = hiringTeamRes?.data ?? [];

  const [mode, setMode] = useState<EmailComposerMode>("general");

  const [genTemplateId, setGenTemplateId] = useState<string>("");
  const [genSubject, setGenSubject] = useState("");
  const [genBody, setGenBody] = useState("");

  const [intTemplateId, setIntTemplateId] = useState<string>("");
  const [intDate, setIntDate] = useState("");
  const [intTime, setIntTime] = useState("");
  const [intTimeZone, setIntTimeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });
  const [intLocation, setIntLocation] = useState("");
  const [intVideoLink, setIntVideoLink] = useState("");
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<
    number[]
  >([]);
  const [otherInterviewers, setOtherInterviewers] = useState("");
  const [intSubject, setIntSubject] = useState("");
  const [intBody, setIntBody] = useState("");
  const [intPlainText, setIntPlainText] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTemplateMutation = usePreviewTemplate();

  useEffect(() => {
    setGenTemplateId("");
    setGenSubject("");
    setGenBody("");
    setMode("general");
    setIntTemplateId("");
    setIntDate("");
    setIntTime("");
    setIntLocation("");
    setIntVideoLink("");
    setOtherInterviewers("");
    setIntBody("");
    setIntPlainText(false);
    setSendError(null);
    setSendSuccess(null);
  }, [candidate.id]);

  useEffect(() => {
    setIntSubject(`Interview — ${candidate.jobTitle ?? "Position"}`);
  }, [candidate.id, candidate.jobTitle]);

  useEffect(() => {
    if (hiringTeam.length === 0) {
      setSelectedInterviewerIds([]);
      return;
    }
    setSelectedInterviewerIds(hiringTeam.map((u) => u.id));
  }, [hiringTeam]);

  const timeZoneOptions = useMemo(() => {
    const set = new Set<string>(TIME_ZONE_OPTIONS);
    if (intTimeZone) set.add(intTimeZone);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [intTimeZone]);

  const interviewerSummary = useMemo(() => {
    const selected = hiringTeam.filter((u) =>
      selectedInterviewerIds.includes(u.id),
    );
    if (selected.length === 0) return "Select interviewers";
    return selected.map(userDisplayName).join(", ");
  }, [hiringTeam, selectedInterviewerIds]);

  const generalTemplates = useMemo(
    () => templates.filter((t) => t.type === "general"),
    [templates],
  );
  const interviewTemplates = useMemo(
    () => templates.filter((t) => t.type === "interview_invite"),
    [templates],
  );
  const selectedTemplate = interviewTemplates.find(
    (t) => String(t.id) === intTemplateId,
  );
  const selectedGeneralTemplate = generalTemplates.find(
    (t) => String(t.id) === genTemplateId,
  );

  const interviewNeedsBody = intPlainText || !selectedTemplate;

  const interviewCanSend =
    intSubject.trim() && (!interviewNeedsBody || intBody.trim());

  const generalCanSend = genSubject.trim() && genBody.trim();

  const toggleInterviewer = (id: number) => {
    setSelectedInterviewerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const sendGeneralEmail = () => {
    setSendError(null);
    setSendSuccess(null);
    sendCandidateEmailMutation.mutate(
      {
        candidateId: candidate.id,
        mode: "general",
        subject: genSubject.trim(),
        body: genBody.trim(),
      },
      {
        onSuccess: () => {
          setSendSuccess("General email sent.");
          setGenTemplateId("");
          setGenSubject("");
          setGenBody("");
        },
        onError: (e) => {
          setSendError((e as Error)?.message ?? "Failed to send email.");
        },
      },
    );
  };

  const applyGeneralTemplate = (nextTemplateId: string) => {
    setGenTemplateId(nextTemplateId);
    const selectedGeneralTemplate = generalTemplates.find(
      (t) => String(t.id) === nextTemplateId,
    );
    if (!selectedGeneralTemplate) return;

    setGenSubject(selectedGeneralTemplate.subject ?? "");
    setGenBody(templateBlocksToEditableText(selectedGeneralTemplate.bodyJson));
  };

  const applyInterviewTemplate = (nextTemplateId: string) => {
    const normalizedTemplateId =
      nextTemplateId && nextTemplateId !== "__none__" ? nextTemplateId : "";
    setIntTemplateId(normalizedTemplateId);
    setIntPlainText(false);

    if (!normalizedTemplateId) {
      setIntSubject(`Interview — ${candidate.jobTitle ?? "Position"}`);
      return;
    }

    const template = interviewTemplates.find(
      (t) => String(t.id) === normalizedTemplateId,
    );
    if (!template) return;

    setIntSubject(template.subject ?? "");
    setIntBody(templateBlocksToEditableText(template.bodyJson));
  };

  const sendInterviewEmail = () => {
    setSendError(null);
    setSendSuccess(null);
    const selectedInterviewerNames = hiringTeam
      .filter((u) => selectedInterviewerIds.includes(u.id))
      .map(userDisplayName);

    sendCandidateEmailMutation.mutate(
      {
        candidateId: candidate.id,
        mode: "interview",
        templateId: intTemplateId ? Number(intTemplateId) : null,
        subject: intSubject.trim(),
        body: interviewNeedsBody ? intBody.trim() : "",
        interview: {
          date: intDate || undefined,
          time: intTime || undefined,
          timeZone: intTimeZone || undefined,
          location: intLocation || undefined,
          videoLink: intVideoLink || undefined,
          interviewers: selectedInterviewerNames,
          otherInterviewers: otherInterviewers || undefined,
        },
      },
      {
        onSuccess: () => {
          setSendSuccess("Interview email sent.");
        },
        onError: (e) => {
          setSendError((e as Error)?.message ?? "Failed to send email.");
        },
      },
    );
  };

  const buildEmailContext = () => {
    const selectedInterviewerNames = hiringTeam
      .filter((u) => selectedInterviewerIds.includes(u.id))
      .map(userDisplayName);
    const interviewersJoined = selectedInterviewerNames.join(", ");
    const mergedInterviewers = [interviewersJoined, otherInterviewers ?? ""]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    const candidateName =
      `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim();
    const [firstName, ...restName] = candidateName.split(" ");
    return {
      candidate_name: candidateName,
      candidate_first_name: firstName || candidateName || "Candidate",
      candidate_last_name: restName.join(" ").trim(),
      job_title: candidate.jobTitle ?? "",
      interview_date: intDate || "",
      interview_time: intTime || "",
      interview_timezone: intTimeZone || "",
      interview_location: intLocation || "",
      interview_video_link: intVideoLink || "",
      interview_interviewers: mergedInterviewers,
    };
  };

  const openPreview = () => {
    setPreviewError(null);
    const context = buildEmailContext();

    if (mode === "general") {
      setPreviewSubject(replacePreviewVars(genSubject, context));
      setPreviewHtml(
        replacePreviewVars(genBody, context).replace(/\n/g, "<br>"),
      );
      setShowPreview(true);
      return;
    }

    if (selectedTemplate && !intPlainText && intTemplateId) {
      previewTemplateMutation.mutate(
        { id: Number(intTemplateId), context },
        {
          onSuccess: (res) => {
            setPreviewSubject(res?.data?.subject ?? intSubject);
            setPreviewHtml(res?.data?.html ?? "");
            setShowPreview(true);
          },
          onError: (e) => {
            setPreviewError(
              (e as Error)?.message ?? "Failed to generate preview.",
            );
          },
        },
      );
      return;
    }

    setPreviewSubject(replacePreviewVars(intSubject, context));
    setPreviewHtml(replacePreviewVars(intBody, context).replace(/\n/g, "<br>"));
    setShowPreview(true);
  };

  const labelClass =
    "text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide";

  return (
    <div className="space-y-2.5 flex flex-col min-h-0">
      <div className="flex items-center justify-end py-0 leading-none">
        <button
          type="button"
          onClick={() => (showPreview ? setShowPreview(false) : openPreview())}
          disabled={previewTemplateMutation.isPending}
          className="text-[12px] leading-none font-medium text-[var(--theme-color)] hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {showPreview ? "Back to form" : "Show email preview"}
        </button>
      </div>
      {previewError && (
        <p className="text-red-500 text-[12px]">{previewError}</p>
      )}
      {showPreview ? (
        <div className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60">
            <div className="grid grid-cols-[72px_1fr] gap-y-1.5 text-[13px]">
              <span className="text-slate-400 dark:text-neutral-500">To</span>
              <span className="text-slate-800 dark:text-neutral-200 font-medium break-all">
                {candidate.email}
              </span>
              <span className="text-slate-400 dark:text-neutral-500">
                Subject
              </span>
              <span className="text-slate-900 dark:text-neutral-100 font-semibold">
                {previewSubject || "—"}
              </span>
            </div>
          </div>
          <div
            className="px-5 py-4 text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed min-h-[180px] max-h-[420px] overflow-y-auto thin-scrollbar-panel"
            dangerouslySetInnerHTML={{
              __html:
                previewHtml ||
                "<span class='text-slate-400 dark:text-neutral-500 italic'>No body content</span>",
            }}
          />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <p className={labelClass}>Message type</p>
            <div className="flex rounded-lg border border-slate-200 dark:border-neutral-800 p-0.5 bg-slate-100/90 dark:bg-neutral-800/60">
              {(
                [
                  { id: "general" as const, label: "General" },
                  { id: "interview" as const, label: "Interview invite" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    "flex-1 rounded-md py-2 text-[13px] font-medium transition-all",
                    mode === id
                      ? "bg-white dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 shadow-sm border border-slate-200/80 dark:border-neutral-700"
                      : "text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "general" ? (
            <div className="space-y-4 h-full flex flex-col">
              <div className="space-y-1.5">
                <Label className={labelClass}>General template</Label>
                <Select
                  value={genTemplateId || "__none__"}
                  onValueChange={(v) => {
                    const next = v ?? "__none__";
                    if (next === "__none__") {
                      setGenTemplateId("");
                      return;
                    }
                    applyGeneralTemplate(next);
                  }}
                >
                  <SelectTrigger className="h-10 min-h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                    <SelectValue placeholder="Choose a general template">
                      {selectedGeneralTemplate?.name ?? undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-60">
                    <SelectItem value="__none__" className="text-[13px]">
                      No template
                    </SelectItem>
                    {generalTemplates.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={String(t.id)}
                        className="text-[13px]"
                      >
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 leading-relaxed">
                  Select a general template to prefill subject and message, then
                  edit before sending.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>To</Label>
                <Input
                  value={candidate.email}
                  readOnly
                  className="h-10 border-slate-200 dark:border-neutral-800 shadow-none bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 text-[13px] focus-visible:ring-0 focus-visible:border-slate-200 dark:focus-visible:border-neutral-800 cursor-default"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Subject</Label>
                <Input
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  placeholder="e.g. Update on your application"
                  className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] dark:focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                />
              </div>
              <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                <Label className={labelClass}>Message</Label>
                <textarea
                  value={genBody}
                  onChange={(e) => setGenBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="flex-1 min-h-[160px] w-full rounded-md border border-slate-200 dark:border-neutral-800 px-3 py-2.5 text-[13px] text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-950 leading-relaxed resize-none focus:outline-none focus:border-[var(--theme-color)] dark:focus:border-[var(--theme-color)] transition-[border-color] duration-200"
                />
              </div>
              <div className="flex items-center justify-between pt-1 shrink-0">
                <span className="text-[12px] text-slate-400 dark:text-neutral-500">
                  Sending to{" "}
                  <strong className="text-slate-600 dark:text-neutral-300">
                    {candidate.email}
                  </strong>
                </span>
                <Button
                  disabled={
                    !generalCanSend || sendCandidateEmailMutation.isPending
                  }
                  onClick={sendGeneralEmail}
                  className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] gap-2 px-5 h-9 rounded-[8px] shadow-none border-none disabled:opacity-50"
                >
                  <HugeiconsIcon
                    icon={SentIcon}
                    className="size-4 rotate-[-45deg]"
                    strokeWidth={2.5}
                  />
                  {sendCandidateEmailMutation.isPending
                    ? "Sending..."
                    : "Send Email"}
                </Button>
              </div>
              {sendError && (
                <p className="text-red-500 text-[12px]">{sendError}</p>
              )}
              {sendSuccess && (
                <p className="text-green-600 text-[12px]">{sendSuccess}</p>
              )}
            </div>
          ) : (
            <div className="space-y-5 pb-1">
              <div className="space-y-1.5">
                <Label className={labelClass}>Template</Label>
                <Select
                  value={intTemplateId || "__none__"}
                  onValueChange={(v) => applyInterviewTemplate(v ?? "__none__")}
                >
                  <SelectTrigger className="h-10 min-h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                    <SelectValue placeholder="Choose a template">
                      {selectedTemplate?.name ?? undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-60">
                    <SelectItem value="__none__" className="text-[13px]">
                      No template (plain text only)
                    </SelectItem>
                    {interviewTemplates.map((t) => (
                      <SelectItem
                        key={t.id}
                        value={String(t.id)}
                        className="text-[13px]"
                      >
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <p className={labelClass}>Interview schedule</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Date</Label>
                    <DatePickerField
                      value={intDate}
                      onChange={setIntDate}
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelClass}>Time</Label>
                    <Input
                      type="time"
                      value={intTime}
                      onChange={(e) => setIntTime(e.target.value)}
                      className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Time zone</Label>
                  <Select
                    value={intTimeZone}
                    onValueChange={(v) => setIntTimeZone(v ?? "UTC")}
                  >
                    <SelectTrigger className="h-10 min-h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      side="bottom"
                      align="start"
                      sideOffset={6}
                      className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-56 w-80"
                    >
                      {timeZoneOptions.map((tz) => (
                        <SelectItem
                          key={tz}
                          value={tz}
                          className="text-[13px] font-mono"
                        >
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <p className={labelClass}>Location &amp; video</p>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Location</Label>
                  <Input
                    value={intLocation}
                    onChange={(e) => setIntLocation(e.target.value)}
                    placeholder="Office address or Remote"
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Video link</Label>
                  <Input
                    value={intVideoLink}
                    onChange={(e) => setIntVideoLink(e.target.value)}
                    placeholder="Zoom / Meet / Teams URL (optional)"
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className={labelClass}>Interviewers</p>
                <div className="space-y-1.5">
                  <Label className={labelClass}>
                    From this job&apos;s hiring team
                  </Label>
                  <Popover>
                    <PopoverTrigger
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full h-auto min-h-10 justify-start text-left font-normal border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[13px] text-slate-700 dark:text-neutral-300 px-3 py-2 whitespace-normal shadow-none",
                      )}
                    >
                      {interviewerSummary}
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[min(100vw-2.5rem,480px)] p-3 border-slate-200 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-[12px] border-[var(--theme-color)] text-[var(--theme-color)] hover:bg-[var(--theme-color)]/10 shadow-none"
                          onClick={() =>
                            setSelectedInterviewerIds(
                              hiringTeam.map((u) => u.id),
                            )
                          }
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[12px] text-slate-600 dark:text-neutral-400"
                          onClick={() => setSelectedInterviewerIds([])}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {hiringTeam.length === 0 ? (
                          <p className="text-[12px] text-slate-400">
                            No hiring team on this job yet.
                          </p>
                        ) : (
                          hiringTeam.map((u) => (
                            <label
                              key={u.id}
                              className="flex items-center gap-2.5 cursor-pointer text-[13px] text-slate-700 dark:text-neutral-300"
                            >
                              <Checkbox
                                checked={selectedInterviewerIds.includes(u.id)}
                                onCheckedChange={() => toggleInterviewer(u.id)}
                                variant="theme"
                                className="size-4 shrink-0"
                              />
                              <span>{userDisplayName(u)}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 leading-relaxed">
                    Choosing an interview template selects everyone on the team
                    by default; use the menu to change who is listed.
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <Label className={labelClass}>Other names (optional)</Label>
                  <Input
                    value={otherInterviewers}
                    onChange={(e) => setOtherInterviewers(e.target.value)}
                    placeholder="Guest interviewers not on the hiring team"
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>To</Label>
                <Input
                  value={candidate.email}
                  readOnly
                  className="h-10 border-slate-200 dark:border-neutral-800 shadow-none bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 text-[13px] focus-visible:ring-0 cursor-default"
                />
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Subject</Label>
                <Input
                  value={intSubject}
                  onChange={(e) => setIntSubject(e.target.value)}
                  placeholder="Interview — Role at Company"
                  className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className={labelClass}>Message</Label>
                {selectedTemplate && !intPlainText ? (
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-600 bg-slate-50/50 dark:bg-neutral-900/30 px-4 py-3 text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                    <p>
                      Body comes from the selected template. Need a text box?{" "}
                      <button
                        type="button"
                        className="text-[var(--theme-color)] font-medium hover:underline"
                        onClick={() => {
                          if (!intBody.trim() && selectedTemplate) {
                            setIntBody(
                              templateBlocksToEditableText(
                                selectedTemplate.bodyJson,
                              ),
                            );
                          }
                          setIntPlainText(true);
                        }}
                      >
                        Switch to plain text.
                      </button>
                    </p>
                  </div>
                ) : (
                  <textarea
                    value={intBody}
                    onChange={(e) => setIntBody(e.target.value)}
                    placeholder="Write your interview message here..."
                    className="min-h-[140px] w-full rounded-md border border-slate-200 dark:border-neutral-800 px-3 py-2.5 text-[13px] text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-950 leading-relaxed resize-none focus:outline-none focus:border-[var(--theme-color)]"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[12px] text-slate-400 dark:text-neutral-500">
                  Sending to{" "}
                  <strong className="text-slate-600 dark:text-neutral-300">
                    {candidate.email}
                  </strong>
                </span>
                <Button
                  disabled={
                    !interviewCanSend || sendCandidateEmailMutation.isPending
                  }
                  onClick={sendInterviewEmail}
                  className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] gap-2 px-5 h-9 rounded-[8px] shadow-none border-none disabled:opacity-50"
                >
                  <HugeiconsIcon
                    icon={SentIcon}
                    className="size-4 rotate-[-45deg]"
                    strokeWidth={2.5}
                  />
                  {sendCandidateEmailMutation.isPending
                    ? "Sending..."
                    : "Send Email"}
                </Button>
              </div>
              {sendError && (
                <p className="text-red-500 text-[12px]">{sendError}</p>
              )}
              {sendSuccess && (
                <p className="text-green-600 text-[12px]">{sendSuccess}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const offerLabelClass =
  "text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide";

function SidePanelOfferTab({ candidate }: { candidate: CandidateDetail }) {
  const offer = candidate.offer;
  const { data: templatesRes } = useTemplates();
  const allTemplates = templatesRes?.data ?? [];
  const offerTemplates = useMemo(
    () => allTemplates.filter((t) => t.type === "offer"),
    [allTemplates],
  );
  const offerWithdrawalTemplates = useMemo(
    () => allTemplates.filter((t) => t.type === "offer_withdrawal"),
    [allTemplates],
  );

  const updateOfferMutation = useUpdateOffer();
  const updateOfferStatusMutation = useUpdateOfferStatus();
  const manualOfferResponseMutation = useManualOfferResponse();

  const [isEditing, setIsEditing] = useState(false);

  const [templateId, setTemplateId] = useState("");
  const [withdrawTemplateId, setWithdrawTemplateId] = useState("");
  const [benefits, setBenefits] = useState("");
  const [salary, setSalary] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payFreq, setPayFreq] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [showPreview, setShowPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!offer) return;
    setTemplateId(offer.templateId != null ? String(offer.templateId) : "");
    const defaultWithdrawTemplateId =
      offerWithdrawalTemplates.find((t) => t.isDefault)?.id ??
      offerWithdrawalTemplates[0]?.id ??
      null;
    setWithdrawTemplateId(
      defaultWithdrawTemplateId != null ? String(defaultWithdrawTemplateId) : "",
    );
    setBenefits(offer.benefits ?? "");
    setSalary(offer.salary ? String(Number(offer.salary)) : "");
    setCurrency(offer.currency ?? "USD");
    setPayFreq(
      (offer.payFrequency as
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly") ?? "monthly",
    );
    setStartDate(offer.startDate ?? "");
    setExpiryDate(offer.expiryDate ?? "");
    setStatus(offer.status ?? "draft");
    setIsEditing(false);
  }, [candidate.id, offer?.id, offer?.updatedAt, offerWithdrawalTemplates]);

  if (!offer) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
        <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
          <span className="text-2xl">📄</span>
        </div>
        <p className="text-slate-500 dark:text-neutral-400 font-medium text-[14px]">
          No offer yet
        </p>
        <p className="text-slate-400 dark:text-neutral-500 text-[13px] max-w-[220px] leading-relaxed">
          An offer will appear here once the candidate reaches an offer stage.
        </p>
      </div>
    );
  }

  const isDraft = offer.status === "draft";
  const showForm = isDraft || isEditing;
  const offerStyle =
    OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft;

  const templateDisplayName =
    offerTemplates.find((t) => t.id === offer.templateId)?.name ??
    (offer.templateId ? `Template #${offer.templateId}` : "—");
  const selectedOfferTemplate = offerTemplates.find(
    (t) => String(t.id) === templateId,
  );

  const offerResponse = candidate.offerResponse;
  const isAcceptanceWindowOpen =
    !!offerResponse &&
    offerResponse.isActive &&
    offerResponse.status === "pending";
  const candidateAlreadyResponded =
    !!offerResponse &&
    (offerResponse.status === "accepted" ||
      offerResponse.status === "declined");
  const manualDecisionDisabled =
    manualOfferResponseMutation.isPending || candidateAlreadyResponded;

  const buildPayload = (): Partial<Offer> => ({
    templateId: templateId ? Number(templateId) : null,
    benefits: benefits.trim() || null,
    salary: salary ? Number(salary) : null,
    currency: currency || null,
    payFrequency: payFreq as Offer["payFrequency"],
    startDate: startDate || null,
    expiryDate: expiryDate || null,
  });

  const saveDraft = () => {
    updateOfferMutation.mutate({ offerId: offer.id, data: buildPayload() });
  };

  const sendOffer = () => {
    updateOfferMutation.mutate(
      { offerId: offer.id, data: buildPayload() },
      {
        onSuccess: () => {
          updateOfferStatusMutation.mutate({ id: offer.id, status: "sent" });
        },
      },
    );
  };

  const saveEdits = () => {
    const newStatus = status as Offer["status"];
    const statusChanged = newStatus !== offer.status;
    updateOfferMutation.mutate(
      { offerId: offer.id, data: buildPayload() },
      {
        onSuccess: () => {
          if (statusChanged) {
            updateOfferStatusMutation.mutate(
              { id: offer.id, status: newStatus },
              { onSuccess: () => setIsEditing(false) },
            );
          } else {
            setIsEditing(false);
          }
        },
      },
    );
  };

  const openEdit = () => {
    setTemplateId(offer.templateId != null ? String(offer.templateId) : "");
    setBenefits(offer.benefits ?? "");
    setSalary(offer.salary ? String(Number(offer.salary)) : "");
    setCurrency(offer.currency ?? "USD");
    setPayFreq(
      (offer.payFrequency as
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "yearly") ?? "monthly",
    );
    setStartDate(offer.startDate ?? "");
    setExpiryDate(offer.expiryDate ?? "");
    setStatus(offer.status ?? "draft");
    setIsEditing(true);
  };

  const openOfferPreview = () => {
    setPreviewError(null);
    if (!offer.renderedHtml?.trim()) {
      setPreviewError(
        "No rendered offer letter available yet. Save the offer first.",
      );
      return;
    }
    setShowPreview(true);
  };

  const markManualDecision = (
    decision: "accepted" | "declined" | "withdrawn",
  ) => {
    const selectedWithdrawTemplateId = withdrawTemplateId
      ? Number(withdrawTemplateId)
      : null;
    const fallbackWithdrawTemplateId =
      offerWithdrawalTemplates.find((t) => t.isDefault)?.id ??
      offerWithdrawalTemplates[0]?.id ??
      null;
    manualOfferResponseMutation.mutate({
      id: offer.id,
      decision,
      responderName: "Recruiter",
      templateId:
        decision === "withdrawn"
          ? selectedWithdrawTemplateId ?? fallbackWithdrawTemplateId
          : null,
    });
  };

  const formFields = (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className={offerLabelClass}>Offer letter template</Label>
        <Select
          value={templateId || "__none__"}
          onValueChange={(v) => {
            const next = v ?? "";
            setTemplateId(next && next !== "__none__" ? next : "");
          }}
        >
          <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
            <SelectValue placeholder="Select template">
              {selectedOfferTemplate?.name ?? undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-56">
            <SelectItem value="__none__" className="text-[13px]">
              Standard offer letter (default)
            </SelectItem>
            {offerTemplates.map((t) => (
              <SelectItem
                key={t.id}
                value={String(t.id)}
                className="text-[13px]"
              >
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <p className={offerLabelClass}>Pay &amp; currency</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={offerLabelClass}>Currency</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v ?? "USD")}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                  <SelectItem key={c} value={c} className="text-[13px]">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={offerLabelClass}>Pay frequency</Label>
            <Select
              value={payFreq}
              onValueChange={(v) => setPayFreq(v ?? "monthly")}
            >
              <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                {["hourly", "daily", "weekly", "monthly", "yearly"].map((f) => (
                  <SelectItem
                    key={f}
                    value={f}
                    className="text-[13px] capitalize"
                  >
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={offerLabelClass}>Salary or rate</Label>
        <Input
          type="number"
          min={0}
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="e.g. 65000"
          className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
        />
      </div>

      <div className="space-y-3">
        <p className={offerLabelClass}>Start date &amp; offer deadline</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className={offerLabelClass}>Start date</Label>
            <DatePickerField
              value={startDate}
              onChange={setStartDate}
              placeholder="Select start date"
            />
          </div>
          <div className="space-y-1.5">
            <Label className={offerLabelClass}>Offer expires</Label>
            <DatePickerField
              value={expiryDate}
              onChange={setExpiryDate}
              placeholder="Select expiry date"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={offerLabelClass}>
          Perks &amp; benefits (optional)
        </Label>
        <textarea
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder="For example: health insurance, paid time off, remote days… (use {{benefits}} in your letter template)"
          className="min-h-[100px] w-full rounded-md border border-slate-200 dark:border-neutral-800 px-3 py-2.5 text-[13px] text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-950 leading-relaxed resize-none focus:outline-none focus:border-[var(--theme-color)]"
        />
      </div>

      {!isDraft && isEditing && (
        <div className="space-y-1.5">
          <Label className={offerLabelClass}>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}>
            <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              {[
                "draft",
                "sent",
                "pending",
                "accepted",
                "declined",
                "withdrawn",
              ].map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-[13px] capitalize"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end py-0 leading-none">
        <button
          type="button"
          onClick={() =>
            showPreview ? setShowPreview(false) : openOfferPreview()
          }
          className="text-[12px] leading-none font-medium text-[var(--theme-color)] hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {showPreview ? "Back to form" : "Show email preview"}
        </button>
      </div>
      {previewError && (
        <p className="text-red-500 text-[12px]">{previewError}</p>
      )}
      {showPreview ? (
        <div className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/60">
            <div className="grid grid-cols-[72px_1fr] gap-y-1.5 text-[13px]">
              <span className="text-slate-400 dark:text-neutral-500">To</span>
              <span className="text-slate-800 dark:text-neutral-200 font-medium break-all">
                {candidate.email}
              </span>
              <span className="text-slate-400 dark:text-neutral-500">
                Subject
              </span>
              <span className="text-slate-900 dark:text-neutral-100 font-semibold">
                {offerTemplates.find((t) => t.id === offer.templateId)
                  ?.subject ?? "Offer Letter"}
              </span>
            </div>
          </div>
          <div
            className="px-5 py-4 text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed min-h-[180px] max-h-[420px] overflow-y-auto thin-scrollbar-panel"
            dangerouslySetInnerHTML={{
              __html:
                offer.renderedHtml ||
                "<span class='text-slate-400 dark:text-neutral-500 italic'>No body content</span>",
            }}
          />
        </div>
      ) : (
        <>
          {showForm && isDraft && (
            <div className="rounded-lg border border-sky-200/80 dark:border-sky-900/50 bg-sky-50/90 dark:bg-sky-950/25 px-3 py-2.5 text-[12px] text-sky-900 dark:text-sky-100/90 leading-relaxed">
              <strong>Save draft</strong> persists your offer details;{" "}
              <strong>Send</strong> emails{" "}
              <span className="font-mono break-all">{candidate.email}</span>.
              Perks use{" "}
              <code className="text-[11px] bg-white/70 dark:bg-sky-950/50 px-1 rounded border border-sky-200/60 dark:border-sky-800">
                {`{{benefits}}`}
              </code>{" "}
              in the template.
            </div>
          )}

          {showForm && !isDraft && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                Edit offer
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none rounded-lg gap-1.5"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdits}
                  disabled={
                    updateOfferMutation.isPending ||
                    updateOfferStatusMutation.isPending
                  }
                  className="h-8 px-3 text-[12px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg gap-1.5"
                >
                  <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                  {updateOfferMutation.isPending ||
                  updateOfferStatusMutation.isPending
                    ? "Saving…"
                    : "Save"}
                </Button>
              </div>
            </div>
          )}

          {showForm ? (
            <>
              {formFields}

              {isDraft && (
                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updateOfferMutation.isPending}
                    onClick={saveDraft}
                    className="h-10 w-full border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg text-[13px] font-medium"
                  >
                    {updateOfferMutation.isPending ? "Saving…" : "Save draft"}
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      updateOfferMutation.isPending ||
                      updateOfferStatusMutation.isPending
                    }
                    onClick={sendOffer}
                    className="h-10 w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg text-[13px] font-medium"
                  >
                    <HugeiconsIcon
                      icon={SentIcon}
                      className="size-4 rotate-[-45deg] mr-2"
                      strokeWidth={2.5}
                    />
                    Send
                  </Button>
                </div>
              )}

              {updateOfferMutation.isError && (
                <p className="text-red-500 text-[12px]">
                  {(updateOfferMutation.error as Error).message ??
                    "Failed to save offer."}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className={offerLabelClass}>Status</span>
                  <Badge
                    className={`${offerStyle.bg} ${offerStyle.text} hover:opacity-90 border-none shadow-none font-semibold px-3 py-1 rounded-md text-[11px] uppercase tracking-wider`}
                  >
                    {offer.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {(offer.status === "sent" || offer.status === "pending") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateOfferStatusMutation.isPending}
                      onClick={() =>
                        updateOfferStatusMutation.mutate({
                          id: offer.id,
                          status: "sent",
                        })
                      }
                      className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none rounded-lg gap-1.5"
                    >
                      <HugeiconsIcon
                        icon={SentIcon}
                        className="size-3.5 rotate-[-45deg]"
                        strokeWidth={2.5}
                      />
                      {updateOfferStatusMutation.isPending
                        ? "Resending…"
                        : "Resend"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openEdit}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon
                      icon={PencilEdit01Icon}
                      className="size-3.5"
                    />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-4 py-3 space-y-3">
                  <p className={offerLabelClass}>Candidate&apos;s response</p>
                  {offerWithdrawalTemplates.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className={offerLabelClass}>
                        Withdrawal template
                      </Label>
                      <Select
                        value={withdrawTemplateId || "__none__"}
                        onValueChange={(v) => {
                          const next = v ?? "__none__";
                          setWithdrawTemplateId(
                            next !== "__none__" ? next : "",
                          );
                        }}
                      >
                        <SelectTrigger className="h-10 min-h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                          <SelectValue placeholder="Default withdrawal template" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-56">
                          <SelectItem value="__none__" className="text-[13px]">
                            Use default withdrawal template
                          </SelectItem>
                          {offerWithdrawalTemplates.map((t) => (
                            <SelectItem
                              key={t.id}
                              value={String(t.id)}
                              className="text-[13px]"
                            >
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markManualDecision("accepted")}
                      disabled={manualDecisionDisabled}
                      className="h-8 rounded-md border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-3 text-[12px] font-semibold disabled:opacity-45"
                    >
                      Accepted
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markManualDecision("declined")}
                      disabled={manualDecisionDisabled}
                      className="h-8 rounded-md border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-600 dark:text-red-300 px-3 text-[12px] font-semibold disabled:opacity-45"
                    >
                      Declined
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markManualDecision("withdrawn")}
                      disabled={
                        manualOfferResponseMutation.isPending ||
                        !isAcceptanceWindowOpen ||
                        candidateAlreadyResponded
                      }
                      className="h-8 rounded-md border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 px-3 text-[12px] font-semibold disabled:opacity-45"
                    >
                      Withdraw offer
                    </Button>
                  </div>
                  {candidateAlreadyResponded && (
                    <p className="text-[12px] text-slate-500 dark:text-neutral-400">
                      Candidate already submitted a response. Manual actions are
                      disabled.
                    </p>
                  )}
                  {!candidateAlreadyResponded && !isAcceptanceWindowOpen && (
                    <p className="text-[12px] text-slate-500 dark:text-neutral-400">
                      Withdraw is available only during the acceptance period.
                    </p>
                  )}
                  {offerResponse?.respondedAt && (
                    <p className="text-[12px] text-slate-500 dark:text-neutral-400">
                      Last response: {offerResponse.status} on{" "}
                      {new Date(offerResponse.respondedAt).toLocaleString()}
                      {offerResponse.responderName
                        ? ` by ${offerResponse.responderName}`
                        : ""}
                    </p>
                  )}
                </div>
                {[
                  { label: "Letter template", value: templateDisplayName },
                  {
                    label: "Salary",
                    value: offer.salary
                      ? `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}${offer.payFrequency ? ` / ${offer.payFrequency}` : ""}`.trim()
                      : "—",
                  },
                  { label: "Start Date", value: formatDate(offer.startDate) },
                  { label: "Expiry Date", value: formatDate(offer.expiryDate) },
                  {
                    label: "Benefits",
                    value: offer.benefits?.trim() ? offer.benefits : "—",
                  },
                  {
                    label: "Sent At",
                    value: offer.sentAt
                      ? timeAgo(offer.sentAt)
                      : "Not sent yet",
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between px-4 py-3 gap-4"
                  >
                    <span className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium shrink-0">
                      {label}
                    </span>
                    <span className="text-[13px] text-slate-800 dark:text-neutral-200 font-semibold text-right break-words">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

interface CandidateSidePanelProps {
  candidateId: number;
  /** When false, candidate detail is not fetched (e.g. sheet closed). */
  open?: boolean;
  defaultTab?: "job-fit" | "answers" | "history" | "offer" | "email" | "scores";
}

export function CandidateSidePanel({
  candidateId,
  open = true,
  defaultTab = "job-fit",
}: CandidateSidePanelProps) {
  const { data, isLoading, isError, error } = useCandidate(candidateId, {
    enabled: !!candidateId,
    pollCvWhileSheetOpen: open,
  });
  const candidate = data?.data;
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };

  if (isError) {
    return (
      <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex flex-col items-center justify-center gap-2 bg-white dark:bg-neutral-950 shrink-0 p-5">
        <p className="text-red-600 dark:text-red-400 text-sm font-medium">
          Couldn&apos;t load candidate
        </p>
        <p className="text-slate-500 dark:text-neutral-500 text-xs text-center max-w-[280px]">
          {(error as Error)?.message ?? "Request failed"}
        </p>
      </div>
    );
  }

  if (!candidate) return null;

  const offer = candidate.offer;
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;

  const cvAnalysis = candidate.cvAnalysis;

  const TABS = [
    { value: "job-fit", label: "Job fit" },
    { value: "answers", label: "Answers" },
    { value: "history", label: "Stage History" },
    { value: "offer", label: "Offer" },
    { value: "email", label: "Send Email" },
    { value: "scores", label: "Assessments" },
  ];

  const triggerBase =
    "shrink-0 data-active:!bg-[var(--theme-color)] data-active:!border-[var(--theme-color)] data-active:!text-white border border-slate-200 dark:border-neutral-800 rounded-[8px] px-4 py-1.5 text-[13px] font-medium text-slate-600 dark:text-neutral-400 shadow-none bg-white dark:bg-neutral-900 cursor-pointer whitespace-nowrap";

  return (
    <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-950 overflow-hidden shrink-0">
      <div className="h-[58px] shrink-0 flex items-center px-5 border-b border-slate-100 dark:border-neutral-800">
        {candidate.resumeUrl ? (
          <a href={candidate.resumeUrl} target="_blank" rel="noreferrer">
            <Button className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[12px] gap-2 px-4 h-9 rounded-[8px] shadow-none border-none">
              <span>View CV</span>
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                className="size-4"
                strokeWidth={2.5}
              />
            </Button>
          </a>
        ) : (
          <span className="text-slate-400 dark:text-neutral-500 text-sm italic">
            No resume uploaded
          </span>
        )}
      </div>

      <Tabs
        defaultValue={defaultTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden m-0 min-h-0"
      >
        <div
          ref={tabsScrollRef}
          onWheel={handleTabsWheel}
          className="border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="px-4 py-2.5">
            <TabsList className="bg-transparent h-fit p-0 w-max flex gap-1.5">
              {TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value} className={triggerBase}>
                  {label}
                  {value === "job-fit" && cvAnalysis?.status === "pending" && (
                    <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                      …
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <TabsContent
          value="job-fit"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          <CandidateJobFitTab resumeUrl={candidate.resumeUrl} cv={cvAnalysis} />
        </TabsContent>

        <TabsContent
          value="answers"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          {candidate.answers.length === 0 &&
          candidate.selections.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-sm italic">
              No custom answers submitted.
            </p>
          ) : (
            <div className="space-y-5">
              {candidate.answers.map((a) => (
                <div key={a.id} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                    {a.questionTitle || `Question #${a.questionId}`}
                  </p>
                  <p className="text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {a.answerText ?? (
                      <em className="text-slate-400 dark:text-neutral-500">
                        No text answer
                      </em>
                    )}
                  </p>
                </div>
              ))}
              {candidate.selections.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  {Array.from(
                    new Set(
                      candidate.selections.map(
                        (s) => s.questionTitle || `Question #${s.questionId}`,
                      ),
                    ),
                  ).map((title) => (
                    <div key={title} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                        {title}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {candidate.selections
                          .filter(
                            (s) =>
                              (s.questionTitle ||
                                `Question #${s.questionId}`) === title,
                          )
                          .map((s) => (
                            <span
                              key={s.id}
                              className="text-[12px] bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-2.5 py-1 rounded-md font-medium border border-slate-200 dark:border-neutral-700"
                            >
                              {s.optionLabel || `Option #${s.optionId}`}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="history"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          {candidate.history.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-sm italic">
              No stage history yet.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-neutral-800" />
              <div className="space-y-5 pl-6">
                {candidate.history.map((h, i) => (
                  <div key={h.id} className="relative">
                    <div
                      className={`absolute -left-6 top-1 size-3.5 rounded-full border-2 border-white dark:border-neutral-950 ring-2 ${
                        i === candidate.history.length - 1
                          ? "bg-[var(--theme-color)] ring-[var(--theme-color)]/30"
                          : "bg-slate-300 dark:bg-neutral-700 ring-slate-200 dark:ring-neutral-800"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200">
                        {h.stageName ?? `Stage #${h.stageId}`}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {timeAgo(h.movedAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {new Date(h.movedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="offer"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          <SidePanelOfferTab candidate={candidate} />
        </TabsContent>

        <TabsContent
          value="email"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          <SidePanelEmailTab
            candidate={candidate}
            active={activeTab === "email"}
          />
        </TabsContent>

        <TabsContent
          value="scores"
          className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel"
        >
          {(() => {
            const attempts = candidate.assessmentAttempts ?? [];
            if (attempts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                  <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-slate-500 font-medium text-[14px]">
                    No assessments yet
                  </p>
                  <p className="text-slate-400 text-[13px] max-w-[220px] leading-relaxed">
                    Assessment results will appear here once the candidate
                    completes an assessment.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {attempts.map((a) => {
                  const statusStyles: Record<
                    string,
                    { bg: string; text: string; label: string }
                  > = {
                    pending: {
                      bg: "bg-amber-50",
                      text: "text-amber-600",
                      label: "Pending",
                    },
                    started: {
                      bg: "bg-blue-50",
                      text: "text-blue-600",
                      label: "In Progress",
                    },
                    completed: {
                      bg: "bg-green-50",
                      text: "text-green-700",
                      label: "Completed",
                    },
                    expired: {
                      bg: "bg-slate-100",
                      text: "text-slate-500",
                      label: "Expired",
                    },
                  };
                  const s = statusStyles[a.status] ?? statusStyles.pending;
                  const score =
                    a.scorePercentage != null
                      ? Math.round(Number(a.scorePercentage))
                      : null;
                  const passColor = a.passed
                    ? "text-green-600"
                    : "text-red-500";

                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-neutral-900 border-b border-slate-100 dark:border-neutral-800">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 truncate pr-3">
                          {a.assessmentTitle}
                        </p>
                        <span
                          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${s.bg} dark:bg-opacity-20 ${s.text}`}
                        >
                          {s.label}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {score != null && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 dark:text-neutral-400 font-medium">
                              Score
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-28 h-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${score >= 50 ? "bg-green-500" : "bg-red-400"}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span
                                className={`text-[13px] font-bold ${passColor}`}
                              >
                                {score}%
                              </span>
                            </div>
                          </div>
                        )}
                        {a.passed != null && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">
                              Result
                            </span>
                            <span
                              className={`text-[13px] font-semibold ${passColor}`}
                            >
                              {a.passed ? "Passed ✓" : "Not Passed ✗"}
                            </span>
                          </div>
                        )}
                        {a.completedAt && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">
                              Completed
                            </span>
                            <span className="text-[13px] text-slate-700 dark:text-neutral-300 font-medium">
                              {formatDate(a.completedAt)}
                            </span>
                          </div>
                        )}
                        {a.status === "completed" && (
                          <div className="px-4 py-3">
                            <Link
                              href={`/candidates/${candidateId}/assessments/${a.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "default",
                                  size: "default",
                                }),
                                "w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] h-9 rounded-[8px] shadow-none border-none hover:text-white",
                              )}
                            >
                              Show Candidate Answers
                            </Link>
                          </div>
                        )}
                        {a.status === "pending" && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">
                              Link expires
                            </span>
                            <span className="text-[13px] text-slate-700 dark:text-neutral-300 font-medium">
                              {formatDate(a.expiresAt)}
                            </span>
                          </div>
                        )}
                        {(a.status === "pending" || a.status === "started") && (
                          <div className="px-4 py-3">
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/assessment/${a.token}`;
                                navigator.clipboard.writeText(url);
                              }}
                              className="text-[12px] text-[var(--theme-color)] font-medium hover:underline"
                            >
                              Copy assessment link
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
