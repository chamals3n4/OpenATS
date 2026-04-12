"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SentIcon,
  PencilEdit01Icon,
  Cancel01Icon,
  Tick02Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import { CandidateJobFitTab } from "@/components/candidate-job-fit-tab";
import { useCandidateDetailSheet } from "@/components/candidate-detail-sheet-context";
import {
  useCandidate,
  useJob,
  usePipeline,
  useTemplates,
  useUpdateOffer,
  useUpdateOfferStatus,
  useCandidateAssessments,
  useSendCandidateEmail,
  usePreviewTemplate,
  useHiringTeam,
} from "@/hooks/use-api";
import { toast } from "sonner";
import { formatTimeAgo } from "@/lib/time-ago";
import { buildOfferTemplatePreviewContext } from "@/lib/build-offer-template-preview-context";
function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** `<input type="date">` only accepts YYYY-MM-DD; API may return full ISO strings. */
function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) return ymd[1];
  const t = Date.parse(s);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Merged over API preview context for interview_invite so composers see TBD, not sample dates. */
function formatInterviewDateForEmail(isoDate: string): string {
  const s = isoDate.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return "—";
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** `type="time"` value `HH:mm` → locale time string (e.g. 2:30 PM). */
function formatInterviewTimeForEmail(hhmm: string): string {
  const s = hhmm.trim();
  if (!s || !/^\d{1,2}:\d{2}/.test(s)) return "";
  const [hStr, mStr] = s.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  const d = new Date(2000, 0, 1, h, m);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** IANA IDs for interview `{{interview_time}}` suffix (shown after clock time). */
const INTERVIEW_INVITE_TIMEZONES: { value: string; label: string }[] = [
  { value: "", label: "Unspecified" },
  { value: "UTC", label: "UTC" },
  { value: "Pacific/Honolulu", label: "Honolulu (HST)" },
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles" },
  { value: "America/Denver", label: "Mountain — Denver" },
  { value: "America/Chicago", label: "Central — Chicago" },
  { value: "America/New_York", label: "Eastern — New York" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Colombo", label: "Colombo" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

function buildInterviewTimeLine(timeHHMM: string, timezoneIana: string): string {
  const timePart = formatInterviewTimeForEmail(timeHHMM);
  const tz = timezoneIana.trim();
  const tzLabel =
    tz === ""
      ? ""
      : (INTERVIEW_INVITE_TIMEZONES.find((o) => o.value === tz)?.label ?? tz);
  if (timePart && tzLabel) return `${timePart} (${tzLabel})`;
  if (timePart) return timePart;
  return "—";
}

/** Maps interview form state → template preview/send context (merged over API base context). */
function buildInterviewInvitePreviewContext(p: {
  interviewInviteDate: string;
  interviewInviteTime: string;
  interviewInviteTimezone: string;
  interviewInviteLocation: string;
  interviewInviteVideoLink: string;
  interviewInviteInterviewers: string;
}) {
  return {
    interview_date: formatInterviewDateForEmail(p.interviewInviteDate),
    interview_time: buildInterviewTimeLine(
      p.interviewInviteTime,
      p.interviewInviteTimezone,
    ),
    interview_location: p.interviewInviteLocation.trim() || "—",
    video_link: p.interviewInviteVideoLink.trim() || "—",
    interviewer_names: p.interviewInviteInterviewers.trim() || "—",
  };
}

/** Row from `GET /jobs/:jobId/team` (junction + user). */
type JobHiringTeamMember = {
  userId: number;
  firstName?: string | null;
  lastName?: string | null;
};

/** Ordered userIds → display names; unknown ids skipped; optional extra free-text names appended. */
function buildInterviewerNamesLine(
  orderedUserIds: number[],
  team: JobHiringTeamMember[],
  extraNamesTrimmed: string,
): string {
  const map = new Map(
    team.map((m) => [
      m.userId,
      `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim(),
    ]),
  );
  const fromTeam = orderedUserIds
    .map((id) => map.get(id))
    .filter((s): s is string => Boolean(s));
  const parts = [...fromTeam];
  if (extraNamesTrimmed) parts.push(extraNamesTrimmed);
  return parts.join(", ");
}

/**
 * HTML → plain text for the composer when leaving template mode.
 * `innerText` alone often collapses adjacent block elements (packed paragraphs); we insert
 * breaks from `</p>`, `<br>`, etc. before stripping tags.
 */
function htmlToPlainTextEmailBody(html: string): string {
  const raw = html.trim();
  if (!raw) return "";

  if (typeof document === "undefined") {
    return raw
      .replace(/\r\n?/g, "\n")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*p\s*>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  let t = html
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*h[1-6]\s*>/gi, "\n\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<\/\s*tr\s*>/gi, "\n")
    .replace(/<\s*hr\s*\/?>/gi, "\n---\n");

  t = t.replace(/<[^>]+>/g, "");

  const decoder = document.createElement("textarea");
  decoder.innerHTML = t.trim();
  let out = decoder.value.replace(/\u00a0/g, " ");

  out = out.replace(/[ \t]+$/gm, "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

const OFFER_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400" },
  sent: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
  pending: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400" },
  accepted: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-600 dark:text-green-400" },
  declined: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-500 dark:text-red-400" },
  withdrawn: { bg: "bg-slate-50 dark:bg-neutral-800", text: "text-slate-500 dark:text-neutral-400" },
};

interface CandidateSidePanelProps {
  candidateId: number;
  /** When false, candidate detail is not fetched (e.g. sheet closed). */
  open?: boolean;
}

export function CandidateSidePanel({
  candidateId,
  open = true,
}: CandidateSidePanelProps) {
  const { data, isLoading, refetch: refetchCandidateDetail } = useCandidate(
    candidateId,
    {
      enabled: open && !!candidateId,
    },
  );
  const candidate = data?.data;
  const offer = candidate?.offer;
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;
  const jobIdForOffer = data?.data?.jobId ?? 0;
  const { data: jobData } = useJob(jobIdForOffer);

  const { data: pipelineData } = usePipeline(candidate?.jobId ?? 0);
  const { data: assessmentsData } = useCandidateAssessments(candidateId);
  const jobIdForCandidate = candidate?.jobId ?? 0;
  const {
    data: hiringTeamRes,
    isLoading: hiringTeamLoading,
    isFetching: hiringTeamFetching,
  } = useHiringTeam(jobIdForCandidate);
  const { data: templatesRes } = useTemplates();
  const stageMap = useMemo(
    () => Object.fromEntries((pipelineData?.data ?? []).map((s) => [s.id, s.name])),
    [pipelineData],
  );

  const allTemplates = templatesRes?.data ?? [];
  const offerTemplates = useMemo(
    () => allTemplates.filter((t) => t.type === "offer"),
    [allTemplates],
  );

  /** Send Email tab: pick General vs Interview invite, then a template of that type. */
  const generalEmailTemplates = useMemo(
    () =>
      [...allTemplates]
        .filter((t) => t.type === "general")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allTemplates],
  );
  const interviewEmailTemplates = useMemo(
    () =>
      [...allTemplates]
        .filter((t) => t.type === "interview_invite")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allTemplates],
  );

  const [emailComposerKind, setEmailComposerKind] = useState<
    "general" | "interview_invite"
  >("general");

  const [interviewInviteDate, setInterviewInviteDate] = useState("");
  /** `type="time"` value (`HH:mm`). */
  const [interviewInviteTime, setInterviewInviteTime] = useState("");
  const [interviewInviteTimezone, setInterviewInviteTimezone] = useState("");
  const [interviewInviteLocation, setInterviewInviteLocation] = useState("");
  const [interviewInviteVideoLink, setInterviewInviteVideoLink] = useState("");
  /** Hiring-team `userId`s in the order they should appear in {{interviewer_names}}. */
  const [interviewInviteInterviewerUserIds, setInterviewInviteInterviewerUserIds] =
    useState<number[]>([]);
  /** Names not on the job team (guest interviewers), appended after selected members. */
  const [interviewInviteInterviewerExtra, setInterviewInviteInterviewerExtra] =
    useState("");

  const hiringTeamMembers: JobHiringTeamMember[] = useMemo(
    () => (hiringTeamRes?.data as JobHiringTeamMember[] | undefined) ?? [],
    [hiringTeamRes?.data],
  );

  const interviewInviteInterviewersLine = useMemo(
    () =>
      buildInterviewerNamesLine(
        interviewInviteInterviewerUserIds,
        hiringTeamMembers,
        interviewInviteInterviewerExtra.trim(),
      ),
    [
      hiringTeamMembers,
      interviewInviteInterviewerExtra,
      interviewInviteInterviewerUserIds,
    ],
  );

  const interviewersTriggerSummary = useMemo(() => {
    const line = interviewInviteInterviewersLine.trim();
    if (!line) return "Choose interviewers…";
    if (line.length > 48) return `${line.slice(0, 46)}…`;
    return line;
  }, [interviewInviteInterviewersLine]);

  const resetInterviewInviteFields = useCallback(() => {
    setInterviewInviteDate("");
    setInterviewInviteTime("");
    setInterviewInviteTimezone("");
    setInterviewInviteLocation("");
    setInterviewInviteVideoLink("");
    setInterviewInviteInterviewerUserIds([]);
    setInterviewInviteInterviewerExtra("");
  }, []);

  const toggleJobTeamInterviewerPick = useCallback(
    (userId: number, checked: boolean) => {
      setInterviewInviteInterviewerUserIds((prev) => {
        if (checked) {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        }
        return prev.filter((id) => id !== userId);
      });
    },
    [],
  );

  const {
    setPreviewPane,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    emailHtml,
    setEmailHtml,
    emailTemplateId,
    setEmailTemplateId,
    setOfferPreviewHtml,
    setOfferPreviewSubject,
  } = useCandidateDetailSheet();

  const emailTemplateIdRef = useRef<number | null>(emailTemplateId);
  emailTemplateIdRef.current = emailTemplateId;
  const interviewPreviewSeqRef = useRef(0);
  const offerPreviewSeqRef = useRef(0);
  /** After picking an interview template, prefill interviewer names once the job hiring team loads. */
  const interviewHiringTeamPrefillPendingRef = useRef(false);
  /** Tracks template selection so we always clear interview fields when it changes (plain text ↔ template, or template A → B). */
  const prevEmailTemplateIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (prevEmailTemplateIdRef.current === undefined) {
      prevEmailTemplateIdRef.current = emailTemplateId;
      return;
    }
    if (prevEmailTemplateIdRef.current === emailTemplateId) return;

    prevEmailTemplateIdRef.current = emailTemplateId;

    resetInterviewInviteFields();
    if (emailTemplateId != null) {
      const t = allTemplates.find((x) => x.id === emailTemplateId);
      interviewHiringTeamPrefillPendingRef.current =
        t?.type === "interview_invite";
    } else {
      interviewHiringTeamPrefillPendingRef.current = false;
    }
  }, [allTemplates, emailTemplateId, resetInterviewInviteFields]);

  /** Loaded template wins so the correct list + toggle show on first paint. */
  const activeEmailComposerKind: "general" | "interview_invite" = useMemo(() => {
    if (emailTemplateId != null) {
      const t = allTemplates.find((x) => x.id === emailTemplateId);
      if (t?.type === "interview_invite") return "interview_invite";
      if (t?.type === "general") return "general";
    }
    return emailComposerKind;
  }, [emailTemplateId, allTemplates, emailComposerKind]);

  const filteredEmailTemplates =
    activeEmailComposerKind === "general"
      ? generalEmailTemplates
      : interviewEmailTemplates;

  const emailTemplateSelectLabel = useMemo(() => {
    if (emailTemplateId == null) return "No template (plain text only)";
    const t = allTemplates.find((x) => x.id === emailTemplateId);
    if (!t) return `Template #${emailTemplateId}`;
    return t.name;
  }, [emailTemplateId, allTemplates]);

  useEffect(() => {
    if (emailTemplateId == null) return;
    const t = allTemplates.find((x) => x.id === emailTemplateId);
    if (
      !t ||
      (t.type !== "general" && t.type !== "interview_invite")
    ) {
      interviewPreviewSeqRef.current += 1;
      resetInterviewInviteFields();
      setEmailHtml(null);
      setEmailTemplateId(null);
    }
  }, [
    allTemplates,
    emailTemplateId,
    resetInterviewInviteFields,
    setEmailHtml,
    setEmailTemplateId,
  ]);

  const switchEmailComposerKind = useCallback(
    (next: "general" | "interview_invite") => {
      /** Use active kind (template can override tab) so we don’t skip a needed reset. */
      if (next === activeEmailComposerKind) return;
      setEmailComposerKind(next);
      interviewPreviewSeqRef.current += 1;
      resetInterviewInviteFields();
      setEmailHtml(null);
      setEmailTemplateId(null);
      setEmailSubject("");
      setEmailBody("");
    },
    [
      activeEmailComposerKind,
      resetInterviewInviteFields,
      setEmailBody,
      setEmailHtml,
      setEmailSubject,
      setEmailTemplateId,
    ],
  );

  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editSalary, setEditSalary] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editPayFreq, setEditPayFreq] = useState("monthly");
  const [editStartDate, setEditStartDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editBenefits, setEditBenefits] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  /** Empty string or "__none__" resolved to null on save; otherwise numeric id string. */
  const [editTemplateId, setEditTemplateId] = useState("");
  const [activeTab, setActiveTab] = useState("job-fit");

  /** Label shown in the template Select trigger (resolved from full template list so the id never shows as the label). */
  const editTemplateSelectLabel = useMemo(() => {
    if (!editTemplateId || editTemplateId === "__none__") return "No template";
    const id = Number(editTemplateId);
    if (!Number.isFinite(id)) return "Select template";
    const t = allTemplates.find((x) => x.id === id);
    if (!t) return `Template #${id}`;
    return `${t.name}${t.isDefault ? " (default)" : ""}`;
  }, [editTemplateId, allTemplates]);

  const updateOfferMutation = useUpdateOffer();
  const updateOfferStatusMutation = useUpdateOfferStatus();
  const sendCandidateEmailMutation = useSendCandidateEmail();
  const previewTemplateMutation = usePreviewTemplate();
  const previewTemplateMutateRef = useRef(previewTemplateMutation.mutateAsync);
  previewTemplateMutateRef.current = previewTemplateMutation.mutateAsync;

  /**
   * Recompile interview-invite HTML on the server. `debounceSeq` ties the response to a
   * debounced run; omit it (e.g. “Show email preview” click) to bump the seq and cancel
   * in-flight debounced requests.
   */
  const flushInterviewInviteEmailPreview = useCallback(
    (debounceSeq?: number) => {
      const tid = emailTemplateIdRef.current;
      if (tid == null) return;
      const tpl = allTemplates.find((x) => x.id === tid);
      if (tpl?.type !== "interview_invite") return;
      const idNow = tid;
      const seq =
        debounceSeq !== undefined
          ? debounceSeq
          : ++interviewPreviewSeqRef.current;

      void previewTemplateMutateRef
        .current({
          id: idNow,
          candidateId,
          context: buildInterviewInvitePreviewContext({
            interviewInviteDate,
            interviewInviteTime,
            interviewInviteTimezone,
            interviewInviteLocation,
            interviewInviteVideoLink,
            interviewInviteInterviewers: interviewInviteInterviewersLine,
          }),
        })
        .then((res) => {
          if (seq !== interviewPreviewSeqRef.current) return;
          if (emailTemplateIdRef.current !== idNow) return;
          setEmailSubject(res.data.subject);
          setEmailHtml(res.data.html);
        })
        .catch((e) => {
          if (seq !== interviewPreviewSeqRef.current) return;
          toast.error(
            e instanceof Error
              ? e.message
              : "Could not refresh interview preview",
          );
        });
    },
    [
      allTemplates,
      candidateId,
      interviewInviteDate,
      interviewInviteInterviewersLine,
      interviewInviteLocation,
      interviewInviteTime,
      interviewInviteTimezone,
      interviewInviteVideoLink,
      setEmailHtml,
      setEmailSubject,
    ],
  );

  useEffect(() => {
    const tid = emailTemplateIdRef.current;
    if (tid == null) return;
    const tpl = allTemplates.find((x) => x.id === tid);
    if (tpl?.type !== "interview_invite") return;

    const seq = ++interviewPreviewSeqRef.current;
    const timer = window.setTimeout(() => {
      if (seq !== interviewPreviewSeqRef.current) return;
      const idNow = emailTemplateIdRef.current;
      if (idNow !== tid) return;
      const tNow = allTemplates.find((x) => x.id === idNow);
      if (tNow?.type !== "interview_invite") return;

      flushInterviewInviteEmailPreview(seq);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [
    allTemplates,
    candidateId,
    emailTemplateId,
    interviewInviteDate,
    interviewInviteInterviewersLine,
    interviewInviteLocation,
    interviewInviteTime,
    interviewInviteTimezone,
    interviewInviteVideoLink,
    flushInterviewInviteEmailPreview,
  ]);

  useEffect(() => {
    const live =
      !!offer && (isEditingOffer || offer.status === "draft");

    if (!live) {
      offerPreviewSeqRef.current += 1;
      setOfferPreviewHtml(null);
      setOfferPreviewSubject(null);
      return;
    }

    if (!editTemplateId || editTemplateId === "__none__") {
      offerPreviewSeqRef.current += 1;
      setOfferPreviewHtml(null);
      setOfferPreviewSubject(null);
      return;
    }

    const tid = Number(editTemplateId);
    if (!Number.isFinite(tid) || tid <= 0) {
      offerPreviewSeqRef.current += 1;
      setOfferPreviewHtml(null);
      setOfferPreviewSubject(null);
      return;
    }

    const tpl = allTemplates.find((x) => x.id === tid);
    if (tpl?.type !== "offer") {
      offerPreviewSeqRef.current += 1;
      setOfferPreviewHtml(null);
      setOfferPreviewSubject(null);
      return;
    }

    const seq = ++offerPreviewSeqRef.current;
    const context = buildOfferTemplatePreviewContext({
      salaryInput: editSalary,
      currency: editCurrency,
      payFrequency: editPayFreq,
      startDate: editStartDate,
      expiryDate: editExpiryDate,
      benefits: editBenefits,
    });

    const timer = window.setTimeout(() => {
      if (seq !== offerPreviewSeqRef.current) return;
      void previewTemplateMutateRef
        .current({
          id: tid,
          candidateId,
          context,
        })
        .then((res) => {
          if (seq !== offerPreviewSeqRef.current) return;
          setOfferPreviewHtml(res.data.html);
          setOfferPreviewSubject(res.data.subject);
        })
        .catch((e) => {
          if (seq !== offerPreviewSeqRef.current) return;
          toast.error(
            e instanceof Error
              ? e.message
              : "Could not refresh offer preview",
          );
        });
    }, 320);

    return () => window.clearTimeout(timer);
  }, [
    allTemplates,
    candidateId,
    editBenefits,
    editCurrency,
    editExpiryDate,
    editPayFreq,
    editSalary,
    editStartDate,
    editTemplateId,
    isEditingOffer,
    offer,
    setOfferPreviewHtml,
    setOfferPreviewSubject,
  ]);

  useEffect(() => {
    const tpl =
      emailTemplateId != null
        ? allTemplates.find((x) => x.id === emailTemplateId)
        : null;
    if (tpl?.type !== "interview_invite") {
      interviewHiringTeamPrefillPendingRef.current = false;
      return;
    }
    if (!interviewHiringTeamPrefillPendingRef.current) return;
    if (!candidate?.jobId) return;
    if (hiringTeamLoading || hiringTeamFetching) return;

    interviewHiringTeamPrefillPendingRef.current = false;

    const team = (hiringTeamRes?.data as JobHiringTeamMember[] | undefined) ?? [];
    if (!team.length) return;
    /** Template pick always resets ids to [] first; prefill assigns the full hiring team once. */
    setInterviewInviteInterviewerUserIds(team.map((m) => m.userId));
  }, [
    allTemplates,
    candidate?.jobId,
    emailTemplateId,
    hiringTeamFetching,
    hiringTeamLoading,
    hiringTeamRes,
  ]);

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;
  /** One-time left-preview default per opened candidate (refetch must not reset pane / fight clicks). */
  const previewBootstrappedForId = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (candidate?.offer?.status === "draft") setIsEditingOffer(false);
  }, [candidate?.offer?.id, candidate?.offer?.status]);

  useLayoutEffect(() => {
    if (isEditingOffer) return;
    const o = candidate?.offer;
    if (!o) return;
    setEditSalary(o.salary ? String(Number(o.salary)) : "");
    const cur = o.currency ? String(o.currency).trim().toUpperCase() : "";
    setEditCurrency(/^[A-Z]{3}$/.test(cur) ? cur : "USD");
    setEditPayFreq(o.payFrequency ?? "monthly");
    setEditStartDate(toDateInputValue(o.startDate));
    setEditExpiryDate(toDateInputValue(o.expiryDate));
    setEditBenefits(o.benefitsText ?? "");
    setEditStatus(o.status ?? "draft");
    setEditTemplateId(o.templateId != null ? String(o.templateId) : "");
  }, [
    candidate?.offer?.id,
    candidate?.offer?.templateId,
    candidate?.offer?.updatedAt,
    isEditingOffer,
  ]);

  const syncLeftPreviewToMainTab = useCallback(
    (tab: string) => {
      const c = candidateRef.current;
      if (!c || c.id !== candidateId) return;
      if (tab === "email") {
        setPreviewPane("email");
        return;
      }
      if (tab === "job-fit") {
        if (c.resumeUrl) setPreviewPane("resume");
        else if (c.offer) setPreviewPane("offer");
        else setPreviewPane("email");
        return;
      }
      if (tab === "offer") {
        setPreviewPane("offer");
      }
    },
    [candidateId, setPreviewPane],
  );

  const handleMainTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      syncLeftPreviewToMainTab(tab);
    },
    [syncLeftPreviewToMainTab],
  );

  useLayoutEffect(() => {
    if (!candidate || candidate.id !== candidateId) return;
    if (previewBootstrappedForId.current === candidateId) return;
    previewBootstrappedForId.current = candidateId;
    if (candidate.resumeUrl) setPreviewPane("resume");
    else if (candidate.offer) setPreviewPane("offer");
    else setPreviewPane("email");
  }, [
    candidateId,
    candidate?.id,
    candidate?.resumeUrl,
    candidate?.offer?.id,
    setPreviewPane,
  ]);

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };

  const fillFromJobAndCandidate = () => {
    const job = jobData?.data;
    if (!job) {
      toast.error("Job details could not be loaded. Wait a moment and try again.");
      return;
    }
    let filledComp = false;
    if (job.salaryType === "fixed" && job.salaryFixed) {
      setEditSalary(String(Number(job.salaryFixed)));
      filledComp = true;
    } else if (job.salaryType === "range" && job.salaryMin && job.salaryMax) {
      setEditSalary(
        String(
          Math.round(
            (Number(job.salaryMin) + Number(job.salaryMax)) / 2,
          ),
        ),
      );
      filledComp = true;
    }
    if (job.currency) setEditCurrency(String(job.currency).trim().toUpperCase());
    const pf = job.payFrequency;
    if (
      pf &&
      ["hourly", "daily", "weekly", "monthly", "yearly"].includes(pf)
    ) {
      setEditPayFreq(pf);
    }
    toast.success(
      filledComp || job.currency || pf
        ? "Filled compensation fields from the job posting."
        : "No salary or pay fields on this job to copy — add them on the job or enter manually.",
    );
  };

  const focusOfferLetterPreview = useCallback(() => {
    if (!offer) {
      toast.error("No offer record is available for this candidate.");
      return;
    }
    if (isEditingOffer) {
      toast.message(
        "Offer letter preview on the left updates as you edit (like Email). Save to persist.",
      );
    }
    setPreviewPane("offer");
    void refetchCandidateDetail().catch(() => {
      /* preview still shows cached letter */
    });
    const elId = `candidate-preview-pane-${candidateId}`;
    const scroll = () => {
      document.getElementById(elId)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(scroll);
    });
  }, [
    candidateId,
    isEditingOffer,
    offer,
    refetchCandidateDetail,
    setPreviewPane,
  ]);

  const openOfferEdit = () => {
    if (!offer) return;
    setEditSalary(offer.salary ? String(Number(offer.salary)) : "");
    const cur = offer.currency ? String(offer.currency).trim().toUpperCase() : "";
    setEditCurrency(/^[A-Z]{3}$/.test(cur) ? cur : "USD");
    setEditPayFreq(offer.payFrequency ?? "monthly");
    setEditStartDate(toDateInputValue(offer.startDate));
    setEditExpiryDate(toDateInputValue(offer.expiryDate));
    setEditBenefits(offer.benefitsText ?? "");
    setEditStatus(offer.status ?? "draft");
    setEditTemplateId(offer.templateId != null ? String(offer.templateId) : "");
    setIsEditingOffer(true);
  };

  const saveOffer = () => {
    if (!offer) return;
    const newStatus = editStatus as "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn";

    if (newStatus === "sent" && offer.status !== "sent") {
      toast.error(
        'To email the offer letter, use "Send offer to candidate" — not the status dropdown.',
      );
      return;
    }

    const salaryTrim = editSalary.trim();
    let salaryNum: number | null = null;
    if (salaryTrim !== "") {
      salaryNum = Number(salaryTrim);
      if (Number.isNaN(salaryNum) || salaryNum < 0) {
        toast.error("Enter a valid salary or leave it empty.");
        return;
      }
      if (salaryNum === 0) {
        toast.error("Salary must be greater than zero, or leave it empty.");
        return;
      }
    }

    let templateIdResolved: number | null = null;
    if (editTemplateId && editTemplateId !== "__none__") {
      const tid = Number(editTemplateId);
      if (Number.isFinite(tid) && tid > 0) templateIdResolved = Math.trunc(tid);
    }

    const currencyTrim = editCurrency.trim().toUpperCase();
    const currencyOut = /^[A-Z]{3}$/.test(currencyTrim) ? currencyTrim : null;

    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        candidateId,
        data: {
          templateId: templateIdResolved,
          salary: salaryNum,
          currency: currencyOut,
          payFrequency: editPayFreq as "hourly" | "daily" | "weekly" | "monthly" | "yearly",
          startDate: editStartDate || null,
          expiryDate: editExpiryDate || null,
          benefitsText: editBenefits.trim() || null,
          status: newStatus,
        },
      },
      {
        onSuccess: () => {
          setPreviewPane("offer");
          setIsEditingOffer(false);
          setOfferPreviewHtml(null);
          setOfferPreviewSubject(null);
          toast.success("Offer saved");
        },
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Failed to save offer",
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex items-center justify-center bg-white dark:bg-neutral-950 shrink-0">
        <p className="text-slate-400 dark:text-neutral-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!candidate) return null;

  const cvAnalysis = candidate.cvAnalysis;
  const resumeViewUrl = candidate.resumeUrl
    ? `/api/candidates/${candidateId}/resume`
    : null;

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

  const orphanOfferTemplateSelected =
    editTemplateId &&
    editTemplateId !== "__none__" &&
    !offerTemplates.some((t) => String(t.id) === editTemplateId);

  const offerTemplateField = (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
        Offer letter template
      </Label>
      <Select
        value={editTemplateId || "__none__"}
        onValueChange={(v) =>
          setEditTemplateId(v == null || v === "__none__" ? "" : v)
        }
      >
        <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] w-full">
          <SelectValue placeholder="Select template">
            {editTemplateSelectLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-[min(60vh,280px)]">
          <SelectItem value="__none__" className="text-[13px] text-slate-500">
            No template
          </SelectItem>
          {orphanOfferTemplateSelected && (
            <SelectItem
              value={editTemplateId}
              className="text-[13px] text-amber-700 dark:text-amber-400"
            >
              {editTemplateSelectLabel}
              {" — not in offer list"}
            </SelectItem>
          )}
          {offerTemplates.map((t) => (
            <SelectItem key={t.id} value={String(t.id)} className="text-[13px]">
              {t.name}
              {t.isDefault ? " (default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {offerTemplates.length === 0 && (
        <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
          Create an offer template under Settings → Templates. Mark one as{" "}
          <strong>default</strong> so it is used when a pipeline stage does not specify a template.
        </p>
      )}
    </div>
  );

  const selectedOfferTemplateLabel =
    offer?.templateId != null
      ? allTemplates.find((t) => t.id === offer.templateId)?.name ??
        `Template #${offer.templateId}`
      : "—";

  return (
    <div className="w-[520px] border-l border-slate-100 dark:border-neutral-800 flex flex-col flex-1 min-h-0 bg-white dark:bg-neutral-950 overflow-hidden shrink-0">
      <Tabs
        value={activeTab}
        onValueChange={handleMainTabChange}
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
                  {value === "offer" && offer && (
                    <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${offerStyle?.bg} dark:bg-opacity-20 ${offerStyle?.text}`}>
                      {offer.status}
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
          <CandidateJobFitTab
            resumeUrl={resumeViewUrl}
            cv={cvAnalysis}
          />
        </TabsContent>

        <TabsContent value="answers" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {candidate.answers.length === 0 && candidate.selections.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-sm italic">No custom answers submitted.</p>
          ) : (
            <div className="space-y-5">
              {candidate.answers.map((a) => (
                <div key={a.id} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                    {a.questionTitle || `Question #${a.questionId}`}
                  </p>
                  <p className="text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {a.answerText ?? <em className="text-slate-400 dark:text-neutral-500">No text answer</em>}
                  </p>
                </div>
              ))}
              {candidate.selections.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  {Array.from(new Set(candidate.selections.map(s => s.questionTitle || `Question #${s.questionId}`))).map((title) => (
                    <div key={title} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
                        {title}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {candidate.selections
                          .filter((s) => (s.questionTitle || `Question #${s.questionId}`) === title)
                          .map((s) => (
                            <span key={s.id} className="text-[12px] bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-2.5 py-1 rounded-md font-medium border border-slate-200 dark:border-neutral-700">
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

        <TabsContent value="history" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {candidate.history.length === 0 ? (
            <p className="text-slate-400 dark:text-neutral-500 text-sm italic">No stage history yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-neutral-800" />
              <div className="space-y-5 pl-6">
                {candidate.history.map((h, i) => (
                  <div key={h.id} className="relative">
                    <div
                      className={`absolute -left-6 top-1 size-3.5 rounded-full border-2 border-white dark:border-neutral-950 ring-2 ${i === candidate.history.length - 1
                        ? "bg-[var(--theme-color)] ring-[var(--theme-color)]/30"
                        : "bg-slate-300 dark:bg-neutral-700 ring-slate-200 dark:ring-neutral-800"
                        }`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200">
                        {stageMap[h.stageId] ?? `Stage #${h.stageId}`}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatTimeAgo(h.movedAt)}
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

        <TabsContent value="offer" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {!offer ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
              <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-slate-500 dark:text-neutral-400 font-medium text-[14px]">No offer yet</p>
              <p className="text-slate-400 dark:text-neutral-500 text-[13px] max-w-[220px] leading-relaxed">
                An offer will appear here once the candidate reaches an offer stage.
              </p>
            </div>
          ) : isEditingOffer ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Edit offer
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setIsEditingOffer(false)}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 shadow-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={saveOffer}
                    disabled={updateOfferMutation.isPending}
                    className="h-8 px-3 text-[12px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                    {updateOfferMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>

              {offerTemplateField}

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Open the offer letter in the left preview and scroll it into view."
                  onClick={focusOfferLetterPreview}
                  className="h-9 px-4 text-[13px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg sm:flex-1 sm:min-w-[140px]"
                >
                  Show letter preview
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Copy salary, currency, and pay frequency from the job posting."
                  onClick={fillFromJobAndCandidate}
                  className="h-9 px-4 text-[13px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg sm:flex-1 sm:min-w-[140px]"
                >
                  Fill from job
                </Button>
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Pay &amp; currency
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Currency</Label>
                    <Select value={editCurrency} onValueChange={(v) => setEditCurrency(v ?? "")}>
                      <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                          <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Pay frequency</Label>
                    <Select value={editPayFreq} onValueChange={(v) => setEditPayFreq(v ?? "")}>
                      <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        {["hourly", "daily", "weekly", "monthly", "yearly"].map((f) => (
                          <SelectItem key={f} value={f} className="text-[13px] capitalize">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Salary or rate</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    placeholder="e.g. 75000"
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Start date &amp; offer deadline
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Start date</Label>
                    <Input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Offer expires</Label>
                    <Input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Perks &amp; benefits (optional)
                </h3>
                <Textarea
                  value={editBenefits}
                  onChange={(e) => setEditBenefits(e.target.value)}
                  placeholder="For example: health insurance, paid time off, remote days… (only if your letter template includes benefits)"
                  rows={4}
                  className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[13px] resize-y min-h-[88px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                  aria-label="Benefits and perks for the offer letter"
                />
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
                  <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {["draft", "sent", "pending", "accepted", "declined", "withdrawn"].map((s) => (
                      <SelectItem key={s} value={s} className="text-[13px] capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {updateOfferMutation.isError && (
                <p className="text-red-500 text-[12px]">
                  {(updateOfferMutation.error as Error).message ?? "Failed to save offer."}
                </p>
              )}
            </div>
          ) : offer.status === "draft" ? (
            <div className="space-y-5">
              <p className="text-[12px] text-slate-600 dark:text-neutral-400 leading-snug rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/90 dark:bg-neutral-900/50 px-3 py-2.5">
                <strong className="text-slate-800 dark:text-neutral-200">Save draft</strong> updates the letter on the left;{" "}
                <strong className="text-slate-800 dark:text-neutral-200">Send</strong> emails{" "}
                <span className="text-slate-700 dark:text-neutral-300">{candidate.email}</span>. Perks use{" "}
                <code className="text-[11px] bg-slate-200/80 dark:bg-neutral-800 px-1 rounded font-mono">{"{{benefits}}"}</code>{" "}
                in the template.
              </p>

              {offerTemplateField}

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Open the offer letter in the left preview and scroll it into view."
                  onClick={focusOfferLetterPreview}
                  className="h-9 px-4 text-[13px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg sm:flex-1 sm:min-w-[140px]"
                >
                  Show letter preview
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Copy salary, currency, and pay frequency from the job posting."
                  onClick={fillFromJobAndCandidate}
                  className="h-9 px-4 text-[13px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg sm:flex-1 sm:min-w-[140px]"
                >
                  Fill from job
                </Button>
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Pay &amp; currency
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Currency</Label>
                    <Select value={editCurrency} onValueChange={(v) => setEditCurrency(v ?? "")}>
                      <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map((c) => (
                          <SelectItem key={c} value={c} className="text-[13px]">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Pay frequency</Label>
                    <Select value={editPayFreq} onValueChange={(v) => setEditPayFreq(v ?? "")}>
                      <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        {["hourly", "daily", "weekly", "monthly", "yearly"].map((f) => (
                          <SelectItem key={f} value={f} className="text-[13px] capitalize">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Salary or rate</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    placeholder="e.g. 75000"
                    className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Start date &amp; offer deadline
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Start date</Label>
                    <Input
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Offer expires</Label>
                    <Input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  Perks &amp; benefits (optional)
                </h3>
                <Textarea
                  value={editBenefits}
                  onChange={(e) => setEditBenefits(e.target.value)}
                  placeholder="For example: health insurance, paid time off, remote days… (only if your letter template includes benefits)"
                  rows={4}
                  className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-[13px] resize-y min-h-[88px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                  aria-label="Benefits and perks for the offer letter"
                />
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-900/30 px-3 py-4 space-y-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveOffer}
                  disabled={updateOfferMutation.isPending}
                  className="h-10 w-full text-[13px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg"
                >
                  {updateOfferMutation.isPending ? "Saving…" : "Save draft & update preview"}
                </Button>
                <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug">
                  The left preview updates as you type (with a template selected). Save to persist the draft.
                </p>
                {!offer.renderedHtml?.trim() && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/35 border border-amber-200/80 dark:border-amber-900/50 rounded-md px-2 py-1.5 leading-snug">
                    Send unlocks after you save with a template.
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    updateOfferStatusMutation.isPending ||
                    !offer.renderedHtml?.trim()
                  }
                  title={
                    !offer.renderedHtml?.trim()
                      ? "Save draft with a template so the letter HTML is built first"
                      : "Email the candidate via Resend"
                  }
                  onClick={() =>
                    updateOfferStatusMutation.mutate(
                      { id: offer.id, status: "sent", candidateId },
                      {
                        onSuccess: () => {
                          toast.success(
                            offer.renderedHtml
                              ? "Offer sent to the candidate’s email."
                              : "Offer marked as sent.",
                          );
                        },
                        onError: (e) => {
                          toast.error(
                            e instanceof Error
                              ? e.message
                              : "Could not send offer",
                          );
                        },
                      },
                    )
                  }
                  className="h-10 w-full text-[13px] bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg gap-1.5 disabled:opacity-50"
                >
                  <HugeiconsIcon icon={SentIcon} className="size-3.5 rotate-[-45deg]" strokeWidth={2.5} />
                  {updateOfferStatusMutation.isPending ? "Sending…" : "Send offer to candidate"}
                </Button>
              </div>

              {updateOfferMutation.isError && (
                <p className="text-red-500 text-[12px]">
                  {(updateOfferMutation.error as Error).message ?? "Failed to save offer."}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[12px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">Status</span>
                  <Badge className={`${offerStyle?.bg} ${offerStyle?.text} hover:opacity-90 border-none shadow-none font-semibold px-3 py-1 rounded-md text-[11px] uppercase tracking-wider`}>
                    {offer.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Switch the left column to Offer letter and scroll it into view."
                    onClick={focusOfferLetterPreview}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg"
                  >
                    Show letter preview
                  </Button>
                  {(offer.status === "sent" || offer.status === "pending") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        updateOfferStatusMutation.isPending ||
                        !offer.renderedHtml
                      }
                      title={
                        !offer.renderedHtml
                          ? "No letter HTML — edit the offer, pick a template, and save."
                          : "Send again via Resend (see RESEND_FROM_EMAIL, e.g. user.openats@gmail.com)"
                      }
                      onClick={() =>
                        updateOfferStatusMutation.mutate(
                          {
                            id: offer.id,
                            status: "sent",
                            candidateId,
                          },
                          {
                            onSuccess: (payload) => {
                              const o = payload?.data;
                              toast.success(
                                o?.renderedHtml
                                  ? "Offer resent to the candidate."
                                  : "Status updated. No email — letter is not rendered yet.",
                              );
                            },
                            onError: (e) => {
                              toast.error(
                                e instanceof Error
                                  ? e.message
                                  : "Could not resend",
                              );
                            },
                          },
                        )
                      }
                      className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 shadow-none rounded-lg gap-1.5 disabled:opacity-50"
                    >
                      <HugeiconsIcon icon={SentIcon} className="size-3.5 rotate-[-45deg]" strokeWidth={2.5} />
                      {updateOfferStatusMutation.isPending ? "Resending…" : "Resend"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openOfferEdit}
                    className="h-8 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 shadow-none rounded-lg gap-1.5"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                {[
                  { label: "Letter template", value: selectedOfferTemplateLabel },
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
                    value:
                      offer.benefitsText?.trim() ? offer.benefitsText.trim() : "—",
                  },
                  { label: "Sent At", value: offer.sentAt ? formatTimeAgo(offer.sentAt) : "Not sent yet" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 gap-4">
                    <span className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium shrink-0">{label}</span>
                    <span className="text-[13px] text-slate-800 dark:text-neutral-200 font-semibold text-right break-words">{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                Use <strong>Offer letter</strong> on the <strong>left</strong> to read the full letter, or stay on this tab for details.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="email" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[12px] text-slate-500 dark:text-neutral-400 leading-relaxed -mt-1 flex-1 min-w-0">
                The <strong>Email</strong> preview on the <strong>left</strong> updates as you type or when you load a template (choose <strong>Email</strong> there if you don’t see it).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={previewTemplateMutation.isPending}
                onClick={() => {
                  setPreviewPane("email");
                  flushInterviewInviteEmailPreview();
                }}
                className="h-8 shrink-0 px-3 text-[12px] border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 shadow-none rounded-lg"
              >
                {previewTemplateMutation.isPending
                  ? "Updating preview…"
                  : "Show email preview"}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">
                Message type
              </Label>
              <div className="flex rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-100/90 dark:bg-neutral-900/90 p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => switchEmailComposerKind("general")}
                  className={`flex-1 min-h-9 rounded-md text-[13px] font-medium transition-colors ${
                    activeEmailComposerKind === "general"
                      ? "bg-white dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 shadow-sm border border-slate-200/80 dark:border-neutral-700"
                      : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  onClick={() => switchEmailComposerKind("interview_invite")}
                  className={`flex-1 min-h-9 rounded-md text-[13px] font-medium transition-colors ${
                    activeEmailComposerKind === "interview_invite"
                      ? "bg-white dark:bg-neutral-950 text-slate-800 dark:text-neutral-100 shadow-sm border border-slate-200/80 dark:border-neutral-700"
                      : "text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200"
                  }`}
                >
                  Interview invite
                </button>
              </div>
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide pt-1">
                Template
              </Label>
              <Select
                value={
                  emailTemplateId != null ? String(emailTemplateId) : "__none__"
                }
                onValueChange={async (v) => {
                  if (v === "__none__") {
                    interviewHiringTeamPrefillPendingRef.current = false;
                    interviewPreviewSeqRef.current += 1;
                    resetInterviewInviteFields();
                    setEmailHtml(null);
                    setEmailTemplateId(null);
                    setEmailSubject("");
                    setEmailBody("");
                    return;
                  }
                  const tid = Number(v);
                  if (!Number.isFinite(tid)) return;
                  const picked = allTemplates.find((x) => x.id === tid);
                  interviewHiringTeamPrefillPendingRef.current =
                    picked?.type === "interview_invite";
                  try {
                    interviewPreviewSeqRef.current += 1;
                    resetInterviewInviteFields();
                    const emptyInterviewCtx = buildInterviewInvitePreviewContext({
                      interviewInviteDate: "",
                      interviewInviteTime: "",
                      interviewInviteTimezone: "",
                      interviewInviteLocation: "",
                      interviewInviteVideoLink: "",
                      interviewInviteInterviewers: "",
                    });
                    const res = await previewTemplateMutation.mutateAsync({
                      id: tid,
                      candidateId,
                      ...(picked?.type === "interview_invite"
                        ? { context: emptyInterviewCtx }
                        : {}),
                    });
                    const d = res.data;
                    setEmailSubject(d.subject);
                    setEmailHtml(d.html);
                    setEmailBody("");
                    setEmailTemplateId(tid);
                    if (picked?.type === "interview_invite") {
                      setEmailComposerKind("interview_invite");
                    } else if (picked?.type === "general") {
                      setEmailComposerKind("general");
                    }
                    setPreviewPane("email");
                  } catch (e) {
                    interviewHiringTeamPrefillPendingRef.current = false;
                    toast.error(
                      e instanceof Error ? e.message : "Could not load template",
                    );
                  }
                }}
                disabled={previewTemplateMutation.isPending}
              >
                <SelectTrigger className="h-10 w-full min-w-0 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)]">
                  <SelectValue placeholder="Choose a template">
                    {emailTemplateSelectLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-[min(50vh,280px)]">
                  <SelectItem value="__none__" className="text-[13px]">
                    No template (plain text only)
                  </SelectItem>
                  {filteredEmailTemplates.map((t) => (
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
              {generalEmailTemplates.length === 0 &&
              interviewEmailTemplates.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug">
                  No <strong>General</strong> or <strong>Interview invite</strong>{" "}
                  templates yet. Add one under Settings → Templates. Rejection and
                  assessment emails use pipeline stages; offer letters use the{" "}
                  <strong>Offer</strong> tab.
                </p>
              ) : filteredEmailTemplates.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug">
                  {activeEmailComposerKind === "general" ? (
                    <>
                      No <strong>General</strong> templates yet. Switch to{" "}
                      <strong>Interview invite</strong> or add one under Settings →
                      Templates.
                    </>
                  ) : (
                    <>
                      No <strong>Interview invite</strong> templates yet. Switch to{" "}
                      <strong>General</strong> or add one under Settings → Templates.
                    </>
                  )}
                </p>
              ) : null}
            </div>

            {emailTemplateId != null &&
              allTemplates.find((x) => x.id === emailTemplateId)?.type ===
                "interview_invite" && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                      Interview schedule
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={interviewInviteDate}
                          onChange={(e) => setInterviewInviteDate(e.target.value)}
                          className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200 w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Time
                        </Label>
                        <Input
                          type="time"
                          value={interviewInviteTime}
                          onChange={(e) => setInterviewInviteTime(e.target.value)}
                          className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200 w-full"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                        Time zone
                      </Label>
                      <Select
                        value={
                          interviewInviteTimezone === ""
                            ? "__unspec__"
                            : interviewInviteTimezone
                        }
                        onValueChange={(v) =>
                          setInterviewInviteTimezone(
                            v == null || v === "__unspec__" ? "" : v,
                          )
                        }
                      >
                        <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full">
                          <SelectValue placeholder="Time zone" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-[min(50vh,280px)]">
                          {INTERVIEW_INVITE_TIMEZONES.map((z) => (
                            <SelectItem
                              key={z.value || "__unspec__"}
                              value={z.value === "" ? "__unspec__" : z.value}
                              className="text-[13px]"
                            >
                              {z.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                      Location &amp; video
                    </h3>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        Location
                      </Label>
                      <Input
                        value={interviewInviteLocation}
                        onChange={(e) =>
                          setInterviewInviteLocation(e.target.value)
                        }
                        placeholder="Office address or Remote"
                        className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200 w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        Video link
                      </Label>
                      <Input
                        value={interviewInviteVideoLink}
                        onChange={(e) =>
                          setInterviewInviteVideoLink(e.target.value)
                        }
                        placeholder="Zoom / Meet / Teams URL (optional)"
                        className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200 w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-neutral-800">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                      Interviewers
                    </h3>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        From this job&apos;s hiring team
                      </Label>
                      <Popover>
                        <PopoverTrigger
                          type="button"
                          disabled={!jobIdForCandidate}
                          className={cn(
                            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 text-left text-[13px] text-slate-800 dark:text-neutral-200 shadow-none outline-none transition-[border-color] duration-200",
                            "focus-visible:ring-0 focus-visible:border-[var(--theme-color)]",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {interviewersTriggerSummary}
                          </span>
                          <HugeiconsIcon
                            icon={ArrowDown01Icon}
                            strokeWidth={2}
                            className="size-4 shrink-0 text-slate-500 dark:text-neutral-500"
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[min(calc(100vw-2rem),320px)] max-h-[min(52vh,320px)] overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg"
                        >
                          {hiringTeamMembers.length === 0 ? (
                            <p className="text-[12px] text-slate-500 dark:text-neutral-500 px-2 py-3 leading-snug">
                              No one is on this job&apos;s hiring team yet. Add
                              people on the{" "}
                              <strong className="text-slate-700 dark:text-neutral-400">
                                job
                              </strong>{" "}
                              page, then open this list again.
                            </p>
                          ) : (
                            <>
                              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 dark:border-neutral-800 px-1 pb-2 mb-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] font-medium text-[var(--theme-color)]"
                                  onClick={() =>
                                    setInterviewInviteInterviewerUserIds(
                                      hiringTeamMembers.map((m) => m.userId),
                                    )
                                  }
                                >
                                  Select all
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] font-medium text-slate-600 dark:text-neutral-400"
                                  onClick={() =>
                                    setInterviewInviteInterviewerUserIds([])
                                  }
                                >
                                  Clear
                                </Button>
                              </div>
                              <ul className="space-y-0.5">
                                {hiringTeamMembers.map((m) => {
                                  const uid = m.userId;
                                  const label =
                                    `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
                                    `User #${uid}`;
                                  const picked =
                                    interviewInviteInterviewerUserIds.includes(
                                      uid,
                                    );
                                  const pickId = `iv-int-${candidateId}-${uid}`;
                                  return (
                                    <li key={uid}>
                                      <label
                                        htmlFor={pickId}
                                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-neutral-800/80"
                                      >
                                        <Checkbox
                                          id={pickId}
                                          checked={picked}
                                          onCheckedChange={(v) =>
                                            toggleJobTeamInterviewerPick(
                                              uid,
                                              !!v,
                                            )
                                          }
                                          variant="theme"
                                          className="size-4 shrink-0 border-slate-300 dark:border-neutral-600"
                                        />
                                        <span className="text-slate-800 dark:text-neutral-200 leading-snug">
                                          {label}
                                        </span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                            </>
                          )}
                        </PopoverContent>
                      </Popover>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug">
                        Choosing an interview template selects everyone on the
                        team by default; use the menu to change who is listed.
                      </p>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                          Other names (optional)
                        </Label>
                        <Input
                          value={interviewInviteInterviewerExtra}
                          onChange={(e) =>
                            setInterviewInviteInterviewerExtra(e.target.value)
                          }
                          placeholder="Guest interviewers not on the hiring team"
                          className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200 w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">To</Label>
              <Input
                value={candidate.email}
                readOnly
                className="h-10 border-slate-200 dark:border-neutral-800 shadow-none bg-slate-50 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 text-[13px] focus-visible:ring-0 focus-visible:border-slate-200 dark:focus-visible:border-neutral-800 cursor-default"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="e.g. Interview Invitation — Software Engineer"
                className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] transition-[border-color] duration-200"
              />
            </div>
            {emailHtml ? (
              <p className="text-[11px] text-slate-500 dark:text-neutral-500 leading-snug rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/80 dark:bg-neutral-900/50 px-3 py-2.5">
                Body comes from the template — check the{" "}
                <strong className="text-slate-600 dark:text-neutral-400">
                  Email
                </strong>{" "}
                preview on the left. Need a text box?{" "}
                <button
                  type="button"
                  className="text-[var(--theme-color)] font-semibold underline-offset-2 hover:underline"
                  onClick={() => {
                    interviewHiringTeamPrefillPendingRef.current = false;
                    interviewPreviewSeqRef.current += 1;
                    const src = emailHtml?.trim() ?? "";
                    let plain = src
                      ? htmlToPlainTextEmailBody(emailHtml as string)
                      : emailBody;
                    if (src && !plain.trim()) {
                      plain = src
                        .replace(/<style[\s\S]*?<\/style>/gi, " ")
                        .replace(/<script[\s\S]*?<\/script>/gi, " ")
                        .replace(/<\s*br\s*\/?>/gi, "\n")
                        .replace(/<\/\s*p\s*>/gi, "\n\n")
                        .replace(/<[^>]+>/g, " ")
                        .replace(/\s+/g, " ")
                        .trim();
                    }
                    resetInterviewInviteFields();
                    setEmailHtml(null);
                    setEmailTemplateId(null);
                    setEmailBody(plain || "");
                  }}
                >
                  Switch to plain text
                </button>
                .
              </p>
            ) : null}
            {!emailHtml ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">
                  Message
                </Label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your message here..."
                  aria-label="Email message body"
                  className="min-h-[200px] max-h-[min(360px,50vh)] w-full rounded-md border border-slate-200 dark:border-neutral-800 px-3 py-2.5 text-[13px] text-slate-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 leading-relaxed whitespace-pre-wrap resize-y overflow-y-auto focus:outline-none focus:border-[var(--theme-color)] transition-[border-color] duration-200"
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-neutral-800 pt-4 mt-1 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-neutral-950">
              <span className="text-[12px] text-slate-400 order-2 sm:order-1">
                Sending to{" "}
                <strong className="text-slate-600 dark:text-neutral-300">
                  {candidate.email}
                </strong>
              </span>
              <Button
                disabled={
                  !emailSubject.trim() ||
                  (!emailBody.trim() && !emailHtml?.trim()) ||
                  sendCandidateEmailMutation.isPending
                }
                onClick={() =>
                  sendCandidateEmailMutation.mutate(
                    {
                      candidateId,
                      subject: emailSubject.trim(),
                      bodyText: emailBody.trim(),
                      bodyHtml: emailHtml?.trim() || undefined,
                      templateId:
                        emailHtml?.trim() && emailTemplateId != null
                          ? emailTemplateId
                          : undefined,
                    },
                    {
                      onSuccess: (res) => {
                        const mid = res?.data?.providerMessageId;
                        toast.success(
                          mid
                            ? `Message sent to the candidate. Provider id: ${mid}.`
                            : "Message sent to the candidate.",
                        );
                      },
                      onError: (e) => {
                        toast.error(
                          e instanceof Error ? e.message : "Failed to send email",
                        );
                      },
                    },
                  )
                }
                className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] gap-2 px-5 h-9 rounded-[8px] shadow-none border-none disabled:opacity-50"
              >
                <HugeiconsIcon icon={SentIcon} className="size-4 rotate-[-45deg]" strokeWidth={2.5} />
                {sendCandidateEmailMutation.isPending ? "Sending…" : "Send Email"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scores" className="flex-1 overflow-y-auto p-5 outline-none min-h-0 thin-scrollbar-panel">
          {(() => {
            const attempts = assessmentsData?.data ?? [];
            if (!assessmentsData) {
              return <p className="text-slate-400 dark:text-neutral-500 text-sm italic">Loading…</p>;
            }
            if (attempts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                  <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-slate-500 font-medium text-[14px]">No assessments yet</p>
                  <p className="text-slate-400 text-[13px] max-w-[220px] leading-relaxed">
                    Assessment results will appear here once the candidate completes an assessment.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {attempts.map((a) => {
                  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
                    pending: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
                    started: { bg: "bg-blue-50", text: "text-blue-600", label: "In Progress" },
                    completed: { bg: "bg-green-50", text: "text-green-700", label: "Completed" },
                    expired: { bg: "bg-slate-100", text: "text-slate-500", label: "Expired" },
                  };
                  const s = statusStyles[a.status] ?? statusStyles.pending;
                  const score = a.scorePercentage != null ? Math.round(Number(a.scorePercentage)) : null;
                  const passColor = a.passed ? "text-green-600" : "text-red-500";

                  return (
                    <div key={a.id} className="rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-neutral-900 border-b border-slate-100 dark:border-neutral-800">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 truncate pr-3">
                          {a.assessmentTitle}
                        </p>
                        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${s.bg} dark:bg-opacity-20 ${s.text}`}>
                          {s.label}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                        {score != null && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 dark:text-neutral-400 font-medium">Score</span>
                            <div className="flex items-center gap-2">
                              <div className="w-28 h-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${score >= 50 ? "bg-green-500" : "bg-red-400"}`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className={`text-[13px] font-bold ${passColor}`}>
                                {score}%
                              </span>
                            </div>
                          </div>
                        )}
                        {a.passed != null && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">Result</span>
                            <span className={`text-[13px] font-semibold ${passColor}`}>
                              {a.passed ? "Passed ✓" : "Not Passed ✗"}
                            </span>
                          </div>
                        )}
                        {a.completedAt && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">Completed</span>
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
                                buttonVariants({ variant: "default", size: "default" }),
                                "w-full bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium text-[13px] h-9 rounded-[8px] shadow-none border-none hover:text-white",
                              )}
                            >
                              Show Candidate Answers
                            </Link>
                          </div>
                        )}
                        {a.status === "pending" && (
                          <div className="px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-[12px] text-slate-500 font-medium">Link expires</span>
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
