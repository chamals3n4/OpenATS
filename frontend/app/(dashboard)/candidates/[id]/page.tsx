"use client";

import { useEffect, useMemo, useState, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft02Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Cancel01Icon,
  CallIcon,
  Mail01Icon,
  SentIcon,
  ArrowUpRight02Icon,
  Target01Icon,
  QuestionIcon,
  Clock01Icon,
  Award01Icon,
  ChartEvaluationIcon,
  File01Icon,
  UserRemove01Icon,
  Calendar02Icon,
  Message02Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import {
  useCandidate,
  useDeleteCandidate,
  useMoveCandidateStage,
  useUpdateCandidateBasicDetails,
} from "@/hooks/queries/use-candidates";
import { usePipeline } from "@/hooks/queries/use-pipeline";
import { useCandidateAssessments, useAttemptResults } from "@/hooks/queries/use-assessments";
import {
  useUpdateOffer,
  useSendOffer,
  useMarkOfferAsHired,
} from "@/hooks/queries/use-offers";
import {
  useRejectCandidate,
  useUnrejectCandidate,
} from "@/hooks/queries/use-candidates";
import { useDeleteInterview } from "@/hooks/queries/use-interviews";
import {
  useInterviewFeedback,
  useDeleteInterviewFeedback,
} from "@/hooks/queries/use-interview-feedback";
import { useTemplates } from "@/hooks/queries/use-templates";
import { serverFetch } from "@/lib/auth-action";
import { CandidateJobFitTab } from "@/components/dynamic-imports";
import { InterviewSchedulerDialog } from "@/components/interview-scheduler-dialog";
import { toast } from "sonner";

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

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

const OFFER_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  draft: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  sent: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  viewed: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    text: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  accepted: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  declined: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
    dot: "bg-red-500",
  },
  expired: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
};

const REJECTION_REASONS = [
  "Lack of required skills",
  "Insufficient experience",
  "Compensation mismatch",
  "Culture/team fit concerns",
  "Role requirements changed",
  "Candidate withdrew",
  "Other",
] as const;

type SectionId =
  | "job-fit"
  | "answers"
  | "history"
  | "offer"
  | "interviews"
  | "rejection"
  | "email"
  | "scores";

const SECTIONS = [
  { id: "job-fit" as SectionId, label: "Job Fit", icon: Target01Icon },
  { id: "answers" as SectionId, label: "Answers", icon: QuestionIcon },
  { id: "history" as SectionId, label: "Stage History", icon: Clock01Icon },
  { id: "offer" as SectionId, label: "Offer", icon: Award01Icon },
  { id: "interviews" as SectionId, label: "Interviews", icon: Calendar02Icon },
  { id: "rejection" as SectionId, label: "Rejection", icon: UserRemove01Icon },
  { id: "email" as SectionId, label: "Send Email", icon: Mail01Icon },
  {
    id: "scores" as SectionId,
    label: "Assessments",
    icon: ChartEvaluationIcon,
  },
];

type SentEmail = {
  id: number;
  subject: string;
  body: string;
  sentAt: string;
};

// ── Interview Card (with feedback read-only dialog) ──────────────────────────

function InterviewCard({
  interview,
  stageMap,
  deleteInterviewMutation,
}: {
  interview: any;
  stageMap: Record<number, string>;
  deleteInterviewMutation: any;
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: feedbackData } = useInterviewFeedback(
    showFeedback ? interview.id : 0,
  );
  const feedback = feedbackData?.data ?? [];
  const deleteFeedbackMutation = useDeleteInterviewFeedback();

  const stageTypeColor = (stageType: string | null) => {
    if (stageType === "screening") return "bg-amber-500";
    if (stageType === "interview") return "bg-blue-500";
    if (stageType === "offer") return "bg-emerald-500";
    return "bg-slate-400";
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Stage type color dot */}
          {interview.stageType && (
            <span
              className={`size-2.5 rounded-full shrink-0 ${stageTypeColor(interview.stageType)}`}
              title={`Stage type: ${interview.stageType}`}
            />
          )}
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200">
              {interview.eventName ??
                stageMap[interview.stageId] ??
                `Interview #${interview.id}`}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={`rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none ${
                  interview.status === "scheduled"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : interview.status === "pending_schedule"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                      : "bg-slate-50 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {interview.status === "scheduled"
                  ? "Confirmed"
                  : interview.status === "pending_schedule"
                    ? "Awaiting Slot"
                    : (interview.status ?? "pending")}
              </Badge>
              {interview.scheduledAt && (
                <>
                  <span className="text-[11px] text-slate-400 dark:text-neutral-500">
                    {new Date(interview.scheduledAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}{" "}
                    {new Date(interview.scheduledAt).toLocaleTimeString(
                      "en-US",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowFeedback(true)}
            className="inline-flex items-center gap-1.5 h-7 rounded-md bg-[var(--theme-color)] px-2.5 text-[11px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] transition-colors"
          >
            <HugeiconsIcon icon={Message02Icon} className="size-3.5" />
            Feedback {feedback.length > 0 ? `(${feedback.length})` : ""}
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this interview?")) {
                deleteInterviewMutation.mutate(interview.id);
              }
            }}
            disabled={deleteInterviewMutation.isPending}
            className="size-7 flex items-center justify-center rounded-md text-slate-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Feedback read-only dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-lg rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg px-6 py-4">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
              Interview Feedback
            </DialogTitle>
          </DialogHeader>
          {feedback.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-neutral-700 px-4 py-8 text-center">
              <p className="text-[13px] text-slate-400 dark:text-neutral-500">
                No feedback yet.
              </p>
              <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                Go to the Interviews page to add feedback.
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-slate-700 dark:text-neutral-300">
                          {fb.authorName}
                        </span>
                        {fb.rating && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-500">
                            <HugeiconsIcon icon={StarIcon} className="size-3" />
                            {fb.rating}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                          {new Date(fb.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-slate-600 dark:text-neutral-400 whitespace-pre-line">
                        {fb.content}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        deleteFeedbackMutation.mutate({
                          interviewId: interview.id,
                          feedbackId: fb.id,
                        })
                      }
                      className="size-6 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-300 hover:text-red-500 shrink-0 transition-colors"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              onClick={() => setShowFeedback(false)}
              className="h-9 rounded-md border-none bg-neutral-700 px-4 text-[13px] font-semibold text-white shadow-none hover:bg-neutral-600"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const unwrappedParams = use(params);
  const candidateId = parseInt(unwrappedParams.id, 10);

  const { data: candidateData, isLoading } = useCandidate(candidateId, {
    enabled: !isNaN(candidateId),
  });
  const candidate = candidateData?.data;

  const { data: pipelineData } = usePipeline(candidate?.jobId ?? 0);
  const { data: assessmentsData } = useCandidateAssessments(candidateId);

  const stageMap = useMemo(
    () =>
      Object.fromEntries((pipelineData?.data ?? []).map((s) => [s.id, s.name])),
    [pipelineData],
  );

  const deleteMutation = useDeleteCandidate();
  const updateMutation = useUpdateCandidateBasicDetails();

  const [activeSection, setActiveSection] = useState<SectionId>("job-fit");
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editResumeFile, setEditResumeFile] = useState<File | null>(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [isCvExpanded, setIsCvExpanded] = useState(false);
  const [viewAttemptId, setViewAttemptId] = useState<number | null>(null);

  const [editSalary, setEditSalary] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editEmploymentType, setEditEmploymentType] = useState<
    "full_time" | "part_time" | "contract" | "internship" | "freelance"
  >("full_time");
  const [editStartDate, setEditStartDate] = useState("");
  const [editReportingManager, setEditReportingManager] = useState("");
  const [editBenefits, setEditBenefits] = useState("");
  const [editOfferLetterHtml, setEditOfferLetterHtml] = useState("");
  const [offerTemplateId, setOfferTemplateId] = useState("");
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editStatus, setEditStatus] = useState("draft");

  const prevCandidateIdRef = useRef<number | null>(null);
  const prevOfferRef = useRef<any>(null);

  useEffect(() => {
    const offer = candidate?.offer;
    const isNewCandidate = prevCandidateIdRef.current !== candidateId;

    if (offer && (isNewCandidate || !prevOfferRef.current)) {
      setEditSalary(offer.salary ? String(Number(offer.salary)) : "");
      setEditCurrency(offer.currency ?? "USD");
      setEditEmploymentType(offer.employmentType ?? "full_time");
      setEditStartDate(offer.startDate ?? "");
      setEditReportingManager(offer.reportingManager ?? "");
      setEditBenefits(offer.benefits ?? "");
      setEditOfferLetterHtml(offer.offerLetterHtml ?? "");
      setOfferTemplateId(offer.templateId ? String(offer.templateId) : "");
      setEditStatus(offer.status ?? "draft");

      if (offer.status === "draft") {
        setIsEditingOffer(true);
      } else {
        setIsEditingOffer(false);
      }
    } else if (!offer && isNewCandidate) {
      setIsEditingOffer(false);
    }

    prevCandidateIdRef.current = candidateId;
    prevOfferRef.current = offer;
  }, [candidateId, candidate?.offer]);

  const updateOfferMutation = useUpdateOffer();
  const sendOfferMutation = useSendOffer();
  const markOfferAsHiredMutation = useMarkOfferAsHired();
  const moveStageMutation = useMoveCandidateStage();

  // Rejection
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectInternalNote, setRejectInternalNote] = useState("");
  const [rejectTemplateId, setRejectTemplateId] = useState("");
  const [shouldSendRejectEmail, setShouldSendRejectEmail] = useState(false);
  const rejectMutation = useRejectCandidate();
  const unrejectMutation = useUnrejectCandidate();
  const { data: templatesData } = useTemplates();
  const allTemplates = templatesData?.data ?? [];
  const emailTemplates = allTemplates.filter((t) => t.type === "email");

  // Interviews
  const [showSchedulerDialog, setShowSchedulerDialog] = useState(false);
  const deleteInterviewMutation = useDeleteInterview();

  const pipelineStages = useMemo(
    () =>
      [...(pipelineData?.data ?? [])].sort((a, b) => a.position - b.position),
    [pipelineData],
  );

  const currentStageId = candidate?.currentStageId
    ? String(candidate.currentStageId)
    : "";
  const effectiveSelectedStageId = selectedStageId || currentStageId;
  const hasStageChange =
    !!candidate &&
    !!effectiveSelectedStageId &&
    Number(effectiveSelectedStageId) !== candidate.currentStageId;

  const openEditDialog = () => {
    if (!candidate) return;
    setEditFirstName(candidate.firstName);
    setEditLastName(candidate.lastName);
    setEditEmail(candidate.email);
    setEditPhone(candidate.phone ?? "");
    setEditResumeFile(null);
    setEditOpen(true);
  };

  const confirmDelete = () => {
    if (!candidate) return;
    deleteMutation.mutate(candidate.id, {
      onSuccess: () => router.push("/candidates"),
    });
  };

  const confirmUpdate = () => {
    if (!candidate) return;
    const formData = new FormData();
    formData.append("firstName", editFirstName.trim());
    formData.append("lastName", editLastName.trim());
    formData.append("email", editEmail.trim());
    formData.append("phone", editPhone.trim());
    if (editResumeFile) formData.append("resume", editResumeFile);

    updateMutation.mutate(
      { id: candidate.id, formData },
      {
        onSuccess: () => {
          setEditOpen(false);
          setEditResumeFile(null);
        },
      },
    );
  };

  const saveStageChange = () => {
    if (!candidate || !effectiveSelectedStageId || !hasStageChange) return;
    moveStageMutation.mutate(
      {
        id: candidate.id,
        newStageId: Number(effectiveSelectedStageId),
      },
      {
        onSuccess: () => setSelectedStageId(""),
      },
    );
  };

  const sendEmail = () => {
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject || !body) return;

    setSentEmails((emails) => [
      {
        id: Date.now(),
        subject,
        body,
        sentAt: new Date().toISOString(),
      },
      ...emails,
    ]);
    setEmailSubject("");
    setEmailBody("");
  };

  const syncOfferForm = () => {
    if (!offer) return;
    setEditSalary(offer.salary ? String(Number(offer.salary)) : "");
    setEditCurrency(offer.currency ?? "USD");
    setEditEmploymentType(offer.employmentType ?? "full_time");
    setEditStartDate(offer.startDate ?? "");
    setEditReportingManager(offer.reportingManager ?? "");
    setEditBenefits(offer.benefits ?? "");
    setEditOfferLetterHtml(offer.offerLetterHtml ?? "");
    setOfferTemplateId(offer.templateId ? String(offer.templateId) : "");
    setEditStatus(offer.status ?? "draft");
  };

  const openOfferEdit = () => {
    syncOfferForm();
    setIsEditingOffer(true);
  };

  const saveOfferDraft = () => {
    if (!offer) return;

    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        data: {
          templateId: offerTemplateId ? Number(offerTemplateId) : null,
          salary: editSalary ? Number(editSalary) : null,
          currency: editCurrency || null,
          employmentType: editEmploymentType,
          startDate: editStartDate || null,
          reportingManager: editReportingManager.trim() || null,
          benefits: editBenefits.trim() || null,
          offerLetterHtml: editOfferLetterHtml.trim() || null,
          status: "draft",
        },
      },
      {
        onSuccess: () => {
          toast.success("Offer draft saved.");
        },
        onError: (error) => {
          toast.error((error as Error).message || "Failed to save draft.");
        },
      },
    );
  };

  const handleSendOffer = () => {
    if (!offer) return;

    if (
      !editSalary ||
      !editCurrency ||
      !editEmploymentType ||
      !editStartDate ||
      !editReportingManager.trim() ||
      !editBenefits.trim() ||
      !editOfferLetterHtml.trim()
    ) {
      toast.error("Complete all required offer fields before sending.");
      return;
    }

    updateOfferMutation.mutate(
      {
        offerId: offer.id,
        data: {
          templateId: offerTemplateId ? Number(offerTemplateId) : null,
          salary: Number(editSalary),
          currency: editCurrency,
          employmentType: editEmploymentType,
          startDate: editStartDate,
          reportingManager: editReportingManager.trim(),
          benefits: editBenefits.trim(),
          offerLetterHtml: editOfferLetterHtml.trim(),
        },
      },
      {
        onSuccess: () => {
          sendOfferMutation.mutate(offer.id, {
            onSuccess: () => {
              toast.success("Offer sent to candidate.");
              setIsEditingOffer(false);
            },
            onError: (error) => {
              toast.error((error as Error).message || "Failed to send offer.");
            },
          });
        },
        onError: (error) => {
          toast.error((error as Error).message || "Failed to update offer.");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50/50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-[3px] border-slate-200 dark:border-neutral-700 border-t-[var(--theme-color)] rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-neutral-500 text-sm font-medium">
            Loading candidate…
          </p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-neutral-950">
        <div className="size-14 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
          <HugeiconsIcon
            icon={QuestionIcon}
            className="size-6 text-slate-400 dark:text-neutral-500"
          />
        </div>
        <p className="text-slate-500 dark:text-neutral-400 font-semibold text-[15px]">
          Candidate not found
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/candidates")}
          className="h-9 px-4 rounded-lg border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-400 font-medium"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} className="size-4 mr-2" />
          Back to Candidates
        </Button>
      </div>
    );
  }

  const offer = candidate.offer;
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;
  const cvAnalysis = candidate.cvAnalysis;
  const initials = getInitials(candidate.firstName, candidate.lastName);
  const selectedStage = pipelineStages.find(
    (stage) => String(stage.id) === effectiveSelectedStageId,
  );
  const selectedStageName =
    selectedStage?.name ?? candidate.stageName ?? "Select stage";

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <div className="shrink-0 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-950">
                    <span className="select-none text-[15px] font-bold">
                      {initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-[22px] font-bold leading-tight text-slate-950 dark:text-neutral-50">
                      {candidate.firstName} {candidate.lastName}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-neutral-400">
                      <span className="truncate">
                        {candidate.jobTitle ?? "Unknown position"}
                      </span>
                      <Badge
                        className={`rounded-md border-none px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-none ${
                          candidate.status === "active"
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : candidate.status === "rejected"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                              : candidate.status === "offered"
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                : candidate.status === "hired"
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {candidate.status}
                      </Badge>
                      {offer && (
                        <Badge
                          className={`${offerStyle?.bg} ${offerStyle?.text} rounded-md border-none px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-none`}
                        >
                          Offer {offer.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-600 dark:text-neutral-300">
                  <a
                    href={`mailto:${candidate.email}`}
                    className="inline-flex min-w-0 items-center gap-2 font-medium hover:text-[var(--theme-color)]"
                  >
                    <HugeiconsIcon
                      icon={Mail01Icon}
                      className="size-4 shrink-0 text-slate-400 dark:text-neutral-500"
                    />
                    <span className="truncate">{candidate.email}</span>
                  </a>
                  <div className="inline-flex items-center gap-2 font-medium">
                    <HugeiconsIcon
                      icon={CallIcon}
                      className="size-4 text-slate-400 dark:text-neutral-500"
                    />
                    <span>{candidate.phone ?? "No phone"}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 font-medium">
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      className="size-4 text-slate-400 dark:text-neutral-500"
                    />
                    <span>Applied {formatDate(candidate.appliedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              <Button
                size="sm"
                disabled={!candidate.resumeUrl}
                className="h-[34px] rounded-md cursor-pointer border-none bg-[var(--theme-color)] px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:bg-neutral-700 disabled:text-neutral-400 disabled:opacity-70"
                onClick={() => setIsCvExpanded(true)}
              >
                <HugeiconsIcon icon={File01Icon} className="size-4" />
                View CV
              </Button>
              <Select
                value={effectiveSelectedStageId}
                onValueChange={(value) => setSelectedStageId(value ?? "")}
                disabled={
                  pipelineStages.length === 0 || moveStageMutation.isPending
                }
              >
                <SelectTrigger className="h-[40px] rounded-md border-none bg-neutral-100 px-4 text-[14px] font-semibold leading-none text-slate-700 shadow-none hover:bg-neutral-200 focus:ring-0 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  <SelectValue>{selectedStageName}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                  {pipelineStages.map((stage) => (
                    <SelectItem
                      key={stage.id}
                      value={String(stage.id)}
                      className="text-[13px]"
                    >
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasStageChange && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={moveStageMutation.isPending}
                    onClick={() => setSelectedStageId("")}
                    className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-3 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={moveStageMutation.isPending}
                    onClick={saveStageChange}
                    className="h-[34px] cursor-pointer rounded-md border-none bg-[var(--theme-color)] px-3 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                  >
                    {moveStageMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                onClick={() => {
                  const back =
                    fromParam === "interviews"
                      ? "/interviews"
                      : fromParam === "pipeline"
                        ? `/jobs/${candidate?.jobId}/pipeline`
                        : "/candidates";
                  router.push(back);
                }}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                Close
              </Button>
              <Button
                size="sm"
                className="h-[34px] cursor-pointer rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                onClick={openEditDialog}
              >
                <HugeiconsIcon icon={PencilEdit01Icon} className="size-4" />
                Edit
              </Button>
              <Button
                size="sm"
                className="h-[34px] cursor-pointer rounded-md border-none bg-red-600 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-red-500"
                onClick={() => setDeleteTarget(true)}
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          <main className="min-w-0">
            <div className="mb-5 flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-lg border border-slate-300 bg-white p-1.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              {SECTIONS.map((s) => {
                const isActive = activeSection === s.id;
                const hasPendingCv =
                  s.id === "job-fit" && cvAnalysis?.status === "pending";
                const hasOffer = s.id === "offer" && offer;

                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-md border px-4 text-[14px] font-semibold leading-none transition-colors ${
                      isActive
                        ? "border-none bg-[var(--theme-color)] text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                        : "border-none bg-neutral-100 text-slate-700 hover:bg-neutral-200 hover:text-slate-950 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={s.icon} className="size-4" />
                    <span>{s.label}</span>
                    {hasPendingCv && (
                      <span className="size-2 rounded-full bg-amber-400" />
                    )}
                    {hasOffer && (
                      <span
                        className={`size-2 rounded-full ${offerStyle?.dot ?? "bg-slate-400"}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              {/* ─── Job Fit ─── */}
              {activeSection === "job-fit" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                      Job Fit Analysis
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      AI-powered match between the candidate&apos;s resume and
                      job requirements
                    </p>
                  </div>
                  <CandidateJobFitTab
                    resumeUrl={candidate.resumeUrl}
                    cv={cvAnalysis}
                  />
                </div>
              )}

              {/* ─── Answers ─── */}
              {activeSection === "answers" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                      Candidate Answers
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Responses to custom application questions
                    </p>
                  </div>
                  {candidate.answers.length === 0 &&
                  candidate.selections.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <HugeiconsIcon
                          icon={QuestionIcon}
                          className="size-5 text-slate-300 dark:text-neutral-600"
                        />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                        No answers submitted
                      </p>
                      <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                        This candidate did not provide custom answers or
                        selections.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {candidate.answers.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-100 dark:border-neutral-800">
                            <p className="text-[12px] font-semibold text-slate-600 dark:text-neutral-300">
                              {a.questionTitle || `Question #${a.questionId}`}
                            </p>
                          </div>
                          <div className="px-4 py-3">
                            <p className="text-[14px] text-slate-700 dark:text-neutral-300 leading-relaxed">
                              {a.answerText ?? (
                                <em className="text-slate-400 dark:text-neutral-500">
                                  No text answer
                                </em>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      {candidate.selections.length > 0 && (
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
                          {Array.from(
                            new Set(
                              candidate.selections.map(
                                (s) =>
                                  s.questionTitle ||
                                  `Question #${s.questionId}`,
                              ),
                            ),
                          ).map((title) => (
                            <div
                              key={title}
                              className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 last:border-0"
                            >
                              <p className="text-[12px] font-semibold text-slate-600 dark:text-neutral-300 mb-2">
                                {title}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {candidate.selections
                                  .filter(
                                    (s) =>
                                      (s.questionTitle ||
                                        `Question #${s.questionId}`) === title,
                                  )
                                  .map((s) => (
                                    <span
                                      key={s.id}
                                      className="text-[12px] bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-3 py-1.5 rounded-lg font-medium border border-slate-200 dark:border-neutral-700"
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
                </div>
              )}

              {/* ─── Stage History ─── */}
              {activeSection === "history" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                      Stage History
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Progression through the hiring pipeline
                    </p>
                  </div>
                  {candidate.history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <HugeiconsIcon
                          icon={Clock01Icon}
                          className="size-5 text-slate-300 dark:text-neutral-600"
                        />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                        No stage history yet
                      </p>
                      <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                        Stage changes will appear here as the candidate moves
                        through the pipeline.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <div className="relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200 dark:bg-neutral-800" />
                        <div className="space-y-5 pl-8">
                          {candidate.history.map((h, i) => (
                            <div key={h.id} className="relative">
                              <div
                                className={`absolute -left-[31px] top-1.5 size-3.5 rounded-full border-[3px] border-white dark:border-neutral-900 ring-2 ${
                                  i === candidate.history.length - 1
                                    ? "bg-[var(--theme-color)] ring-[var(--theme-color)]/30"
                                    : "bg-slate-300 dark:bg-neutral-600 ring-slate-200 dark:ring-neutral-700"
                                }`}
                              />
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200">
                                    {stageMap[h.stageId] ??
                                      `Stage #${h.stageId}`}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-neutral-800 px-2 py-0.5 rounded-md shrink-0">
                                    {timeAgo(h.movedAt)}
                                  </span>
                                </div>
                                <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                                  {new Date(h.movedAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── Offer ─── */}
              {activeSection === "offer" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                      Offer Details
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Compensation package and offer letter
                    </p>
                  </div>
                  {!offer ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <HugeiconsIcon
                          icon={Award01Icon}
                          className="size-5 text-slate-300 dark:text-neutral-600"
                        />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                        No offer yet
                      </p>
                      <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1 max-w-[260px] mx-auto">
                        An offer will appear here once the candidate reaches an
                        offer stage.
                      </p>
                      {(() => {
                        const currentStage = pipelineStages.find(
                          (s) => s.id === candidate.currentStageId,
                        );
                        if (currentStage?.stageType === "offer") {
                          return (
                            <Button
                              size="sm"
                              onClick={() => {
                                serverFetch("/offers", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    candidateId,
                                    jobId: candidate.jobId,
                                  }),
                                })
                                  .then(() => {
                                    queryClient.invalidateQueries({
                                      queryKey: ["candidates", candidateId],
                                    });
                                    toast.success("Offer draft created");
                                  })
                                  .catch(() =>
                                    toast.error("Failed to create offer"),
                                  );
                              }}
                              className="mt-4 h-8 rounded-md border-none bg-[var(--theme-color)] px-4 text-[12px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                            >
                              Generate Offer
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : isEditingOffer ? (
                    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <p className="text-[15px] font-bold text-slate-800 dark:text-neutral-200">
                            Edit Offer
                          </p>
                          <Badge
                            className={`${offerStyle?.bg} ${offerStyle?.text} border-none shadow-none font-bold px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wider`}
                          >
                            {offer?.status ?? "draft"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => setIsEditingOffer(false)}
                            className="h-8 rounded-md border-none bg-neutral-800 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveOfferDraft}
                            disabled={updateOfferMutation.isPending}
                            className="h-8 rounded-md border-none bg-neutral-700 px-4 text-[12px] font-semibold text-white shadow-none hover:bg-neutral-600 disabled:opacity-60"
                          >
                            {updateOfferMutation.isPending
                              ? "Saving…"
                              : "Save Draft"}
                          </Button>
                          <Button
                            size="sm"
                            disabled={
                              updateOfferMutation.isPending ||
                              sendOfferMutation.isPending
                            }
                            onClick={handleSendOffer}
                            className="h-8 rounded-md border-none bg-[var(--theme-color)] px-4 text-[12px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-60"
                          >
                            <HugeiconsIcon
                              icon={SentIcon}
                              className="size-3.5 rotate-[-45deg] mr-1"
                              strokeWidth={2.5}
                            />
                            {sendOfferMutation.isPending
                              ? "Sending…"
                              : "Send Offer"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                            Template
                          </Label>
                          <Select
                            value={offerTemplateId}
                            onValueChange={(v) => setOfferTemplateId(v ?? "")}
                          >
                            <SelectTrigger className="h-11 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-[14px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                              <SelectItem value="" className="text-[13px]">
                                No template
                              </SelectItem>
                              {emailTemplates.map((t) => (
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                              Currency
                            </Label>
                            <Select
                              value={editCurrency}
                              onValueChange={(v) => setEditCurrency(v ?? "")}
                            >
                              <SelectTrigger className="h-11 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-[14px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                                {["USD", "EUR", "GBP", "LKR", "INR", "AUD"].map(
                                  (c) => (
                                    <SelectItem
                                      key={c}
                                      value={c}
                                      className="text-[13px]"
                                    >
                                      {c}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                              Employment Type
                            </Label>
                            <Select
                              value={editEmploymentType}
                              onValueChange={(v) =>
                                setEditEmploymentType(
                                  v as typeof editEmploymentType,
                                )
                              }
                            >
                              <SelectTrigger className="h-11 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-[14px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                                {[
                                  "full_time",
                                  "part_time",
                                  "contract",
                                  "internship",
                                  "freelance",
                                ].map((e) => (
                                  <SelectItem
                                    key={e}
                                    value={e}
                                    className="text-[13px] capitalize"
                                  >
                                    {e.replace("_", "-")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5 mt-4">
                          <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                            Salary
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={editSalary}
                            onChange={(e) => setEditSalary(e.target.value)}
                            placeholder="e.g. 75000"
                            className="h-11 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-[14px] focus:ring-0 focus:border-[var(--theme-color)] rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                              Start Date
                            </Label>
                            <Input
                              type="date"
                              value={editStartDate}
                              onChange={(e) => setEditStartDate(e.target.value)}
                              className="h-11 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-[14px] focus:ring-0 focus:border-[var(--theme-color)] rounded-lg"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                              Reporting Manager
                            </Label>
                            <Input
                              value={editReportingManager}
                              onChange={(e) =>
                                setEditReportingManager(e.target.value)
                              }
                              placeholder="e.g. Jane Smith"
                              className="h-11 border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 shadow-none text-[14px] focus:ring-0 focus:border-[var(--theme-color)] rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                            Benefits
                          </Label>
                          <textarea
                            value={editBenefits}
                            onChange={(e) => setEditBenefits(e.target.value)}
                            placeholder="e.g. Health insurance, 401k matching, 20 PTO days..."
                            className="min-h-[100px] w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 px-3 py-2.5 text-[14px] shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                              Offer Letter (HTML)
                            </Label>
                            <button
                              type="button"
                              onClick={() => {
                                if (offerTemplateId) {
                                  serverFetch<{
                                    data: { subject: string; html: string };
                                  }>(`/templates/${offerTemplateId}/preview`, {
                                    method: "POST",
                                    body: JSON.stringify({ candidateId }),
                                  })
                                    .then((res) => {
                                      setEditOfferLetterHtml(res.data.html);
                                      toast.success(
                                        "Template rendered into editor",
                                      );
                                    })
                                    .catch(() =>
                                      toast.error("Failed to render template"),
                                    );
                                } else {
                                  toast.error(
                                    "Select a template first to generate",
                                  );
                                }
                              }}
                              className="text-[11px] font-semibold text-[var(--theme-color)] hover:underline"
                            >
                              Generate from template
                            </button>
                          </div>
                          <textarea
                            value={editOfferLetterHtml}
                            onChange={(e) =>
                              setEditOfferLetterHtml(e.target.value)
                            }
                            placeholder="<p>Dear candidate...</p>"
                            className="min-h-[180px] w-full rounded-lg border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 px-3 py-2.5 text-[14px] font-mono shadow-none resize-none focus:outline-none focus:border-[var(--theme-color)]"
                          />
                        </div>

                        {updateOfferMutation.isError && (
                          <p className="text-red-500 text-[12px] font-medium">
                            {(updateOfferMutation.error as Error).message ??
                              "Failed to save offer."}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-2.5 rounded-full ${offerStyle?.dot ?? "bg-slate-400"}`}
                            />
                            <span className="text-[13px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                              Status
                            </span>
                            <Badge
                              className={`${offerStyle?.bg} ${offerStyle?.text} hover:opacity-90 border-none shadow-none font-bold px-3 py-1 rounded-md text-[11px] uppercase tracking-wider`}
                            >
                              {offer.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {offer.status === "draft" && (
                              <Button
                                size="sm"
                                disabled={
                                  updateOfferMutation.isPending ||
                                  sendOfferMutation.isPending
                                }
                                onClick={handleSendOffer}
                                className="h-8 rounded-md border-none bg-[var(--theme-color)] px-3 text-[12px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:opacity-60"
                              >
                                <HugeiconsIcon
                                  icon={SentIcon}
                                  className="size-3.5 rotate-[-45deg]"
                                  strokeWidth={2.5}
                                />
                                {sendOfferMutation.isPending
                                  ? "Sending…"
                                  : "Send Offer"}
                              </Button>
                            )}
                            {offer.status === "accepted" && (
                              <Button
                                size="sm"
                                disabled={markOfferAsHiredMutation.isPending}
                                onClick={() =>
                                  markOfferAsHiredMutation.mutate(offer.id, {
                                    onSuccess: () =>
                                      toast.success(
                                        "Candidate marked as hired",
                                      ),
                                    onError: (err) =>
                                      toast.error(
                                        (err as Error).message ||
                                          "Failed to mark as hired",
                                      ),
                                  })
                                }
                                className="h-8 rounded-md border-none bg-emerald-600 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-emerald-500"
                              >
                                {markOfferAsHiredMutation.isPending
                                  ? "Marking…"
                                  : "Mark as Hired"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={openOfferEdit}
                              className="h-8 rounded-md border-none bg-neutral-800 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                            >
                              <HugeiconsIcon
                                icon={PencilEdit01Icon}
                                className="size-3.5"
                              />
                              Edit
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                          {[
                            {
                              label: "Salary",
                              value: offer.salary
                                ? `${offer.currency ?? ""} ${Number(offer.salary).toLocaleString()}`.trim()
                                : "—",
                            },
                            {
                              label: "Employment Type",
                              value: offer.employmentType
                                ? offer.employmentType.replace("_", "-")
                                : "—",
                            },
                            {
                              label: "Start Date",
                              value: formatDate(offer.startDate),
                            },
                            {
                              label: "Reporting Manager",
                              value: offer.reportingManager || "—",
                            },
                            {
                              label: "Sent At",
                              value: offer.sentAt
                                ? formatDate(offer.sentAt)
                                : "Not sent yet",
                            },
                            ...(offer.viewedAt
                              ? [
                                  {
                                    label: "Viewed At",
                                    value: formatDate(offer.viewedAt),
                                  },
                                ]
                              : []),
                            ...(offer.acceptedAt
                              ? [
                                  {
                                    label: "Accepted At",
                                    value: formatDate(offer.acceptedAt),
                                  },
                                ]
                              : []),
                            ...(offer.declinedAt
                              ? [
                                  {
                                    label: "Declined At",
                                    value: formatDate(offer.declinedAt),
                                  },
                                ]
                              : []),
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              className="flex items-center justify-between px-5 py-3.5 gap-4"
                            >
                              <span className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium">
                                {label}
                              </span>
                              <span className="text-[13px] text-slate-800 dark:text-neutral-200 font-semibold text-right break-words">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                        {offer.benefits && (
                          <>
                            <Separator />
                            <div className="px-5 py-4">
                              <p className="text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                                Benefits
                              </p>
                              <p className="text-[13px] text-slate-600 dark:text-neutral-400 whitespace-pre-line leading-relaxed">
                                {offer.benefits}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {offer.offerLetterHtml && (
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
                          <p className="text-[12px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                            Offer Letter Preview
                          </p>
                          <div
                            className="text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed max-h-[340px] overflow-y-auto prose prose-sm w-full"
                            dangerouslySetInnerHTML={{
                              __html: offer.offerLetterHtml,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Interviews ─── */}
              {activeSection === "interviews" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                        Interview Log
                      </h3>
                      <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                        Schedule and track interview outcomes
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setShowSchedulerDialog(true)}
                        className="h-8 rounded-md border-none bg-[var(--theme-color)] px-3 text-[12px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                      >
                        Schedule
                      </Button>
                    </div>
                  </div>

                  {(candidate.interviews ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <HugeiconsIcon
                          icon={Calendar02Icon}
                          className="size-5 text-slate-300 dark:text-neutral-600"
                        />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                        No interviews yet
                      </p>
                      <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1">
                        Click &quot;Schedule&quot; to invite a candidate.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(candidate.interviews ?? []).map((iv) => (
                        <InterviewCard
                          key={iv.id}
                          interview={iv}
                          stageMap={stageMap}
                          deleteInterviewMutation={deleteInterviewMutation}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Rejection ─── */}
              {activeSection === "rejection" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                        Rejection
                      </h3>
                      <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                        Rejection history and actions
                      </p>
                    </div>
                    {candidate.status === "rejected" ? (
                      <Button
                        size="sm"
                        disabled={unrejectMutation.isPending}
                        onClick={() => {
                          unrejectMutation.mutate(candidateId);
                        }}
                        className="h-8 rounded-md border-none bg-slate-700 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-slate-600 disabled:opacity-60"
                      >
                        {unrejectMutation.isPending
                          ? "Restoring…"
                          : "Unreject Candidate"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setIsRejectDialogOpen(true)}
                        className="h-8 rounded-md border-none bg-red-600 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-red-500"
                      >
                        Reject Candidate
                      </Button>
                    )}
                  </div>

                  {(candidate.rejections ?? []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                        <HugeiconsIcon
                          icon={UserRemove01Icon}
                          className="size-5 text-slate-300 dark:text-neutral-600"
                        />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                        {candidate.status === "rejected"
                          ? "Candidate has been rejected"
                          : "No rejections yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(candidate.rejections ?? []).map((r) => (
                        <div
                          key={r.id}
                          className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200">
                                Rejected
                              </span>
                              <Badge
                                className={
                                  r.emailStatus === "sent"
                                    ? "rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                                    : "rounded-md border-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none bg-slate-50 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
                                }
                              >
                                Email: {r.emailStatus}
                              </Badge>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500">
                              {timeAgo(r.rejectedAt)}
                            </span>
                          </div>
                          <div className="px-5 pb-4 space-y-1">
                            <p className="text-[13px] text-slate-600 dark:text-neutral-300">
                              Reason: {r.reason}
                            </p>
                            {r.internalNote && (
                              <p className="text-[12px] text-slate-500 dark:text-neutral-400">
                                Internal note: {r.internalNote}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Dialog
                    open={isRejectDialogOpen}
                    onOpenChange={(open) => setIsRejectDialogOpen(open)}
                  >
                    <DialogContent className="max-w-lg rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl">
                      <DialogHeader>
                        <DialogTitle className="text-[16px] font-bold text-slate-900 dark:text-neutral-100">
                          Reject {candidate.firstName} {candidate.lastName}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
                            Rejection Reason
                          </Label>
                          <Select
                            value={rejectReason}
                            onValueChange={(v) => setRejectReason(v ?? "")}
                          >
                            <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                              {REJECTION_REASONS.map((reason) => (
                                <SelectItem
                                  key={reason}
                                  value={reason}
                                  className="text-[13px]"
                                >
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
                            Internal Note (optional)
                          </Label>
                          <textarea
                            value={rejectInternalNote}
                            onChange={(e) =>
                              setRejectInternalNote(e.target.value)
                            }
                            placeholder="Visible to your team only"
                            className="min-h-[90px] w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-[13px] text-slate-700 dark:text-neutral-300 shadow-none focus:outline-none focus:border-[var(--theme-color)]"
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-neutral-700 px-3 py-2">
                          <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
                            Send Rejection Email
                          </Label>
                          <Switch
                            checked={shouldSendRejectEmail}
                            onCheckedChange={setShouldSendRejectEmail}
                          />
                        </div>

                        {shouldSendRejectEmail && (
                          <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-slate-600 dark:text-neutral-400 uppercase tracking-wider">
                              Email Template
                            </Label>
                            <Select
                              value={rejectTemplateId}
                              onValueChange={(v) =>
                                setRejectTemplateId(v ?? "")
                              }
                            >
                              <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus:ring-0 focus:border-[var(--theme-color)] w-full rounded-lg">
                                <SelectValue placeholder="Select template" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-lg border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                                {emailTemplates.map((t) => (
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
                      </div>

                      <DialogFooter className="gap-2">
                        <Button
                          size="sm"
                          onClick={() => setIsRejectDialogOpen(false)}
                          className="h-8 rounded-md border-none bg-neutral-700 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-neutral-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={
                            rejectMutation.isPending ||
                            !rejectReason ||
                            (shouldSendRejectEmail && !rejectTemplateId)
                          }
                          onClick={() => {
                            rejectMutation.mutate(
                              {
                                id: candidateId,
                                data: {
                                  reason: rejectReason,
                                  internalNote: rejectInternalNote || undefined,
                                  templateId: shouldSendRejectEmail
                                    ? Number(rejectTemplateId)
                                    : undefined,
                                  emailStatus: shouldSendRejectEmail
                                    ? "sent"
                                    : "not_sent",
                                },
                              },
                              {
                                onSuccess: () => {
                                  setIsRejectDialogOpen(false);
                                  setRejectReason("");
                                  setRejectInternalNote("");
                                  setRejectTemplateId("");
                                  setShouldSendRejectEmail(false);
                                },
                              },
                            );
                          }}
                          className="h-8 rounded-md border-none bg-red-600 px-3 text-[12px] font-semibold text-white shadow-none hover:bg-red-500 disabled:opacity-60"
                        >
                          {rejectMutation.isPending
                            ? "Rejecting…"
                            : "Confirm Reject"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* ─── Send Email ─── */}
              {activeSection === "email" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                      Send Email
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Compose and send a message to the candidate
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex flex-1 flex-col space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                            To
                          </Label>
                          <Input
                            value={candidate.email}
                            readOnly
                            className="h-10 border-slate-200 dark:border-neutral-700 shadow-none bg-slate-50 dark:bg-neutral-950 text-slate-700 dark:text-neutral-300 text-[13px] focus-visible:ring-0 rounded-lg cursor-default"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                            Subject
                          </Label>
                          <Input
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="e.g. Interview Invitation - Software Engineer"
                            className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 shadow-none text-[13px] focus-visible:ring-0 focus-visible:border-[var(--theme-color)] rounded-lg"
                          />
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
                          <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                            Message
                          </Label>
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            placeholder="Write your message here..."
                            className="min-h-[180px] w-full flex-1 resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-slate-700 transition-[border-color] duration-200 focus:border-[var(--theme-color)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300"
                          />
                        </div>
                        <div className="flex shrink-0 items-center justify-between pt-2">
                          <span className="text-[12px] text-slate-400">
                            Sending to{" "}
                            <strong className="text-slate-600 dark:text-neutral-300">
                              {candidate.email}
                            </strong>
                          </span>
                          <Button
                            type="button"
                            onClick={sendEmail}
                            disabled={!emailSubject.trim() || !emailBody.trim()}
                            className="h-9 rounded-md border-none bg-[var(--theme-color)] px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:bg-neutral-700 disabled:text-neutral-400 disabled:opacity-70"
                          >
                            <HugeiconsIcon
                              icon={SentIcon}
                              className="size-4 rotate-[-45deg]"
                              strokeWidth={2.5}
                            />
                            Send Email
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-[14px] font-bold text-slate-900 dark:text-neutral-100">
                            Sent Emails
                          </h4>
                          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-neutral-400">
                            {sentEmails.length} total
                          </p>
                        </div>
                        <HugeiconsIcon
                          icon={SentIcon}
                          className="size-4 rotate-[-45deg] text-slate-400 dark:text-neutral-500"
                          strokeWidth={2.3}
                        />
                      </div>
                      {sentEmails.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-neutral-700 dark:bg-neutral-950/50">
                          <p className="text-[13px] font-semibold text-slate-500 dark:text-neutral-400">
                            No emails sent yet
                          </p>
                          <p className="mt-1 text-[12px] text-slate-400 dark:text-neutral-500">
                            Sent messages will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="max-h-[430px] space-y-3 overflow-y-auto pr-1">
                          {sentEmails.map((email) => (
                            <div
                              key={email.id}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="line-clamp-2 text-[13px] font-bold text-slate-800 dark:text-neutral-200">
                                  {email.subject}
                                </p>
                                <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-neutral-500">
                                  {timeAgo(email.sentAt)}
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-4 whitespace-pre-line text-[12px] leading-relaxed text-slate-500 dark:text-neutral-400">
                                {email.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Assessments ─── */}
              {activeSection === "scores" && (
                <div className="p-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-neutral-100">
                      Assessments
                    </h3>
                    <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Test results and evaluation scores
                    </p>
                  </div>
                  {(() => {
                    const attempts = assessmentsData?.data ?? [];
                    if (!assessmentsData) {
                      return (
                        <div className="flex items-center justify-center py-16">
                          <div className="flex items-center gap-2.5 text-slate-400 dark:text-neutral-500">
                            <div className="size-4 border-2 border-slate-300 dark:border-neutral-600 border-t-slate-400 rounded-full animate-spin" />
                            <p className="text-sm font-medium">Loading…</p>
                          </div>
                        </div>
                      );
                    }
                    if (attempts.length === 0) {
                      return (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/30 px-6 py-12 text-center">
                          <div className="size-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                            <HugeiconsIcon
                              icon={ChartEvaluationIcon}
                              className="size-5 text-slate-300 dark:text-neutral-600"
                            />
                          </div>
                          <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                            No assessments yet
                          </p>
                          <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-1 max-w-[280px] mx-auto">
                            Assessment results will appear here once the
                            candidate completes an assessment.
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
                              bg: "bg-amber-50 dark:bg-amber-950/25",
                              text: "text-amber-600 dark:text-amber-400",
                              label: "Pending",
                            },
                            started: {
                              bg: "bg-blue-50 dark:bg-blue-950/25",
                              text: "text-blue-600 dark:text-blue-400",
                              label: "In Progress",
                            },
                            completed: {
                              bg: "bg-green-50 dark:bg-green-950/25",
                              text: "text-green-700 dark:text-green-400",
                              label: "Completed",
                            },
                            expired: {
                              bg: "bg-slate-100 dark:bg-neutral-800",
                              text: "text-slate-500 dark:text-neutral-400",
                              label: "Expired",
                            },
                          };
                          const s =
                            statusStyles[a.status] ?? statusStyles.pending;
                          const score =
                            a.scorePercentage != null
                              ? Math.round(Number(a.scorePercentage))
                              : null;
                          const passColor = a.passed
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-500 dark:text-rose-400";

                          return (
                            <div
                              key={a.id}
                              className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden"
                            >
                              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-100 dark:border-neutral-800">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <HugeiconsIcon
                                    icon={ChartEvaluationIcon}
                                    className="size-4 text-slate-400 shrink-0"
                                  />
                                  <p className="text-[13px] font-semibold text-slate-800 dark:text-neutral-200 truncate">
                                    {a.assessmentTitle}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${s.bg} ${s.text}`}
                                >
                                  {s.label}
                                </span>
                              </div>
                              <div className="divide-y divide-slate-100 dark:divide-neutral-800">
                                {score != null && (
                                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <span className="text-[12px] text-slate-500 dark:text-neutral-400 font-medium">
                                      Score
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-24 h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${score >= 50 ? "bg-emerald-500" : "bg-rose-400"}`}
                                          style={{ width: `${score}%` }}
                                        />
                                      </div>
                                      <span
                                        className={`text-[13px] font-bold tabular-nums ${passColor}`}
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
                                      {a.passed ? "Passed" : "Not Passed"}
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
                                    <button
                                      type="button"
                                      onClick={() => setViewAttemptId(a.id)}
                                      className="text-[12px] text-[var(--theme-color)] font-semibold hover:underline"
                                    >
                                      View candidate answers
                                    </button>
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
                                {(a.status === "pending" ||
                                  a.status === "started") && (
                                  <div className="px-4 py-3">
                                    <button
                                      onClick={() => {
                                        const url = `${window.location.origin}/assessment/${a.token}`;
                                        navigator.clipboard.writeText(url);
                                      }}
                                      className="text-[12px] text-[var(--theme-color)] font-semibold hover:underline"
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Sheet open={isCvExpanded} onOpenChange={setIsCvExpanded}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 border-slate-200 p-0 dark:border-neutral-800 sm:max-w-none lg:w-[min(920px,72vw)]"
        >
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-neutral-800">
            <SheetTitle className="truncate text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              {candidate.firstName} {candidate.lastName} CV
            </SheetTitle>
            <div className="flex shrink-0 items-center gap-2">
              {candidate.resumeUrl && (
                <a
                  href={candidate.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--theme-color)] px-3 text-[14px] font-semibold text-white hover:bg-[var(--theme-color-hover)]"
                >
                  Open in New Tab
                </a>
              )}
              <button
                type="button"
                onClick={() => setIsCvExpanded(false)}
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                aria-label="Collapse CV preview"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
              </button>
            </div>
          </SheetHeader>
          {candidate.resumeUrl ? (
            <iframe
              src={candidate.resumeUrl}
              title={`${candidate.firstName} ${candidate.lastName} CV`}
              className="min-h-0 flex-1 border-0 bg-slate-100 dark:bg-neutral-900"
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-neutral-800">
                <HugeiconsIcon
                  icon={File01Icon}
                  className="size-6 text-slate-400 dark:text-neutral-600"
                />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-slate-500 dark:text-neutral-400">
                  No CV uploaded
                </p>
                <p className="mt-1 text-[12px] text-slate-400 dark:text-neutral-500">
                  Upload a PDF from edit candidate.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-[18px] font-bold text-slate-900 dark:text-neutral-100">
              Edit Candidate
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  First name
                </Label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Last name
                </Label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Phone
                </Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-10 rounded-lg border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)]"
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                    Upload new CV (PDF)
                  </Label>
                  {candidate.resumeUrl ? (
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-semibold text-[var(--theme-color)] hover:underline"
                    >
                      View current CV
                    </a>
                  ) : (
                    <p className="text-[12px] text-slate-400">
                      No CV uploaded yet
                    </p>
                  )}
                </div>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setEditResumeFile(e.target.files?.[0] ?? null)
                  }
                  className="h-10 rounded-lg border-slate-200 dark:border-neutral-700 focus-visible:ring-0 focus-visible:border-[var(--theme-color)] pt-2.5 file:text-[13px]"
                />
                <p className="text-[12px] text-slate-400">
                  If uploaded, the existing CV will be replaced.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0 gap-2">
            <DialogClose
              disabled={updateMutation.isPending}
              className="h-9 rounded-md border-none bg-neutral-800 px-3.5 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer"
            >
              Cancel
            </DialogClose>
            <Button
              onClick={confirmUpdate}
              disabled={updateMutation.isPending}
              className="h-9 rounded-md border-none bg-[var(--theme-color)] px-3.5 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-[var(--theme-color-hover)] disabled:opacity-60 cursor-pointer"
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─── */}
      <AlertDialog
        open={deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(false)}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg p-0 overflow-hidden">
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <div className="size-11 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-3">
              <HugeiconsIcon
                icon={Delete02Icon}
                className="size-5 text-red-500 dark:text-red-400"
              />
            </div>
            <AlertDialogTitle className="text-[17px] font-bold text-slate-900 dark:text-neutral-100">
              Delete candidate?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed mt-1">
              <strong className="text-slate-700 dark:text-neutral-200">
                {candidate.firstName} {candidate.lastName}
              </strong>{" "}
              will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 pb-6 pt-0 gap-2">
            <AlertDialogCancel className="h-9 rounded-md border-none bg-neutral-800 px-3.5 text-[13px] font-semibold text-white shadow-none transition-colors hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="h-9 rounded-md border-none bg-red-600 px-3.5 text-[13px] font-semibold text-white shadow-none hover:bg-red-500 cursor-pointer"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InterviewSchedulerDialog
        candidateId={candidateId}
        candidateName={`${candidate.firstName} ${candidate.lastName}`}
        open={showSchedulerDialog}
        onOpenChange={setShowSchedulerDialog}
        templates={allTemplates}
        pipelineStageId={candidate.currentStageId ?? 0}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["candidates", candidateId],
          });
          queryClient.invalidateQueries({ queryKey: ["interviews"] });
        }}
      />

      <Sheet open={viewAttemptId !== null} onOpenChange={(open) => !open && setViewAttemptId(null)}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full gap-0 border-slate-200 p-0 dark:border-neutral-800 sm:max-w-none lg:w-[min(640px,50vw)] flex flex-col h-full bg-white dark:bg-neutral-900"
        >
          <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-neutral-800 shrink-0">
            <SheetTitle className="truncate text-[16px] font-bold text-slate-900 dark:text-neutral-100">
              Assessment Results
            </SheetTitle>
            <button
              type="button"
              onClick={() => setViewAttemptId(null)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </button>
          </SheetHeader>
          
          <AssessmentResultsSheetContent attemptId={viewAttemptId} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AssessmentResultsSheetContent({ attemptId }: { attemptId: number | null }) {
  const { data, isLoading, isError } = useAttemptResults(attemptId ?? 0, {
    enabled: attemptId !== null,
  });

  if (attemptId === null) return null;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-neutral-950/30">
        <div className="size-6 border-2 border-slate-200 dark:border-neutral-700 border-t-[var(--theme-color)] rounded-full animate-spin mb-2" />
        <p className="text-sm font-medium text-slate-400 dark:text-neutral-500">Loading results…</p>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 dark:bg-neutral-950/30">
        <p className="text-sm font-medium text-red-500">Failed to load assessment answers.</p>
      </div>
    );
  }

  const { attempt, questions } = data.data;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-neutral-950/30 divide-y divide-slate-200 dark:divide-neutral-800">
      <div className="p-5 bg-white dark:bg-neutral-900 space-y-3">
        <div>
          <h4 className="text-[15px] font-bold text-slate-800 dark:text-neutral-200">{attempt.assessmentTitle}</h4>
          {attempt.assessmentDescription && (
            <p className="text-[12px] text-slate-400 dark:text-neutral-500 mt-0.5">{attempt.assessmentDescription}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Candidate</span>
            <p className="text-[13px] font-bold text-slate-800 dark:text-neutral-200 mt-0.5">{attempt.candidateName}</p>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">{attempt.candidateEmail}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Score / Result</span>
            {attempt.scorePercentage != null ? (
              <p className="text-[13px] font-bold mt-0.5">
                <span className={attempt.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}>
                  {Math.round(attempt.scorePercentage)}%
                </span>
                <span className="text-slate-400 dark:text-neutral-500 font-medium"> ({attempt.scoreRaw} / {attempt.scoreTotal} pts)</span>
              </p>
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-neutral-400 font-medium mt-0.5">—</p>
            )}
            <p className={`text-[11px] font-bold mt-0.5 uppercase tracking-wide ${attempt.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
              {attempt.passed ? "Passed" : "Not Passed"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <h5 className="text-[12px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Questions &amp; Answers</h5>
        {questions.map((q, idx) => {
          const hasAnswer = q.answer !== null;
          
          return (
            <div key={q.id} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Question {idx + 1}</span>
                  <h6 className="text-[13px] font-bold text-slate-800 dark:text-neutral-200 leading-snug">{q.title}</h6>
                  {q.description && (
                    <p className="text-[12px] text-slate-400 dark:text-neutral-500">{q.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Points</span>
                  <p className="text-[12px] font-bold text-slate-800 dark:text-neutral-200 mt-0.5">
                    {hasAnswer && q.answer!.pointsEarned !== null ? (
                      <span className={q.answer!.pointsEarned > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-neutral-400"}>
                        {q.answer!.pointsEarned}
                      </span>
                    ) : (
                      <span>0</span>
                    )}
                    <span className="text-slate-400 dark:text-neutral-500 font-medium"> / {q.points}</span>
                  </p>
                </div>
              </div>

              {q.questionType === "text" ? (
                <div className="space-y-1 bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-100 dark:border-neutral-800/60">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">Candidate Response</span>
                  <p className="text-[12px] text-slate-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {q.answer?.answerText || <span className="text-slate-400 dark:text-neutral-500 italic">No answer submitted</span>}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide block mb-1">Options</span>
                  <div className="grid gap-2">
                    {q.options.map((opt) => {
                      const isSelected = q.answer?.selectedOptionIds?.includes(opt.id) ?? false;
                      const isCorrect = opt.isCorrect;
                      
                      let borderClass = "border-slate-100 dark:border-neutral-800/60";
                      let bgClass = "bg-slate-50/50 dark:bg-neutral-950/20";
                      let badge = null;

                      if (isCorrect) {
                        borderClass = "border-emerald-200 dark:border-emerald-800";
                        bgClass = "bg-emerald-50/30 dark:bg-emerald-950/10";
                      }

                      if (isSelected) {
                        if (isCorrect) {
                          badge = (
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wide">
                              Correct Choice
                            </span>
                          );
                        } else {
                          borderClass = "border-rose-200 dark:border-rose-800";
                          bgClass = "bg-rose-50/20 dark:bg-rose-950/10";
                          badge = (
                            <span className="text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400 px-2 py-0.5 rounded uppercase tracking-wide">
                              Incorrect Choice
                            </span>
                          );
                        }
                      } else if (isCorrect) {
                        badge = (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400 px-2 py-0.5 rounded uppercase tracking-wide">
                            Correct Answer
                          </span>
                        );
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center justify-between gap-3 border px-3 py-2 rounded-lg ${borderClass} ${bgClass}`}
                        >
                          <span className="text-[12px] font-medium text-slate-700 dark:text-neutral-300">{opt.label}</span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
