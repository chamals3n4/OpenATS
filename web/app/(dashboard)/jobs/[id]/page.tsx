"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { Ref } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Link01Icon,
  PlusSignIcon,
  Settings02Icon,
  PencilEdit01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  TextIcon,
  ParagraphIcon,
  Tick02Icon,
  CircleIcon,
  SentIcon,
  Cancel01Icon,
  Chatting01Icon,
} from "@hugeicons/core-free-icons";
import {
  useJob,
  usePipeline,
  useCandidates,
  useCurrentUser,
  useChatHistory,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
  useCustomQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useAssessments,
  useJobAssessments,
  useAttachAssessment,
  useDetachAssessment,
  useHiringTeam,
  useAddHiringTeamMember,
  useRemoveHiringTeamMember,
  useUsers,
  useTemplates,
} from "@/hooks/use-api";
import { useJobChat } from "@/hooks/use-job-chat";
import type {
  PipelineStage,
  JobDetail,
  CustomQuestion,
  ChatMessage,
  Candidate,
  User,
} from "@/types";

const STAGE_COLORS: Record<PipelineStage["stageType"], string> = {
  none: "bg-slate-400",
  source: "bg-blue-400",
  assessment: "bg-purple-500",
  interview: "bg-blue-500",
  offer: "bg-green-500",
  rejection: "bg-red-500",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  inactive: {
    label: "Inactive",
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
  published: {
    label: "Active Job",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
  },
  archived: {
    label: "Archived",
    bg: "bg-slate-100 dark:bg-neutral-800",
    text: "text-slate-500 dark:text-neutral-400",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatSalary(job: JobDetail) {
  if (!job.salaryType) return null;
  const fmt = (n: string | null) => (n ? Number(n).toLocaleString() : "");
  const freq = job.payFrequency ?? "";
  if (job.salaryType === "fixed")
    return `${job.currency} ${fmt(job.salaryFixed)}/${freq}`;
  return `${job.currency} ${fmt(job.salaryMin)}-${fmt(job.salaryMax)}/${freq}`;
}
import { useDragSort } from "@/hooks/use-drag-sort";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const JOB_TAB_TRIGGER_CLASS =
  "data-[state=active]:bg-transparent cursor-pointer shadow-none! border border-slate-200 dark:border-neutral-800 data-[state=active]:border-theme rounded-lg px-6 text-slate-600 dark:text-neutral-400 data-[state=active]:text-[var(--theme-color)] font-medium text-[15px] hover:bg-slate-50 dark:hover:bg-neutral-900 flex-none flex items-center justify-center whitespace-nowrap";

const JOB_TAB_PRESS =
  "motion-reduce:transition-none motion-reduce:active:scale-100 " +
  "transition-[transform_280ms_cubic-bezier(0.4,0,0.2,1),background-color_180ms_ease-in-out,border-color_180ms_ease-in-out,color_180ms_ease-in-out,opacity_180ms_ease-in-out] " +
  "active:scale-[0.993]";

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = Number(params.id);
  const queryClient = useQueryClient();

  // Prefetch all per-job data on mount so every tab and the candidate count
  // render immediately without a loading state.
  useEffect(() => {
    if (!jobId) return;

    // Hiring process (pipeline stages)
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "pipeline"],
      queryFn: () =>
        serverFetch<{ data: PipelineStage[] }>(`/jobs/${jobId}/pipeline`),
    });

    // Candidates for this job (drives the count badge on the overview tab)
    void queryClient.prefetchQuery({
      queryKey: ["candidates", jobId, undefined],
      queryFn: () =>
        serverFetch<{ data: Candidate[] }>(`/candidates/jobs/${jobId}`),
      staleTime: 0,
    });

    // Hiring team members
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "team"],
      queryFn: () => serverFetch<{ data: User[] }>(`/jobs/${jobId}/team`),
    });

    // All users (needed for the "add team member" dropdown)
    void queryClient.prefetchQuery({
      queryKey: ["users"],
      queryFn: () => serverFetch<{ data: User[] }>("/users"),
    });

    // Custom questions tab
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "questions"],
      queryFn: () =>
        serverFetch<{ data: CustomQuestion[] }>(`/jobs/${jobId}/questions`),
    });

    // Assessments attached to this job
    void queryClient.prefetchQuery({
      queryKey: ["jobs", jobId, "assessments"],
      queryFn: () => serverFetch<{ data: any[] }>(`/jobs/${jobId}/assessments`),
    });

    // Discussion / internal notes history
    void queryClient.prefetchQuery({
      queryKey: ["chat", "job", jobId],
      queryFn: () => serverFetch<{ data: ChatMessage[] }>(`/chat/job/${jobId}`),
    });
  }, [jobId, queryClient]);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notesPanelWidth, setNotesPanelWidth] = useState(350);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);

  const { data: jobData, isLoading: jobLoading } = useJob(jobId);
  const { data: pipelineData } = usePipeline(jobId);
  const { data: jobCandidatesData, isPending: jobCandidatesPending } =
    useCandidates(jobId, undefined, {
      enabled: Number.isFinite(jobId) && jobId > 0,
    });
  const jobCandidateCount = jobCandidatesData?.data?.length ?? 0;
  const { data: meData } = useCurrentUser();
  const { data: chatHistoryData } = useChatHistory(jobId, isNotesOpen);
  const { liveMessages, sendMessage, editMessage, deleteMessage } = useJobChat(
    jobId,
    isNotesOpen,
  );
  const { data: customQuestionsData } = useCustomQuestions(jobId);

  const createStageMutation = useCreateStage(jobId);
  const updateStageMutation = useUpdateStage(jobId);
  const deleteStageMutation = useDeleteStage(jobId);
  const reorderStagesMutation = useReorderStages(jobId);
  const createQuestionMutation = useCreateQuestion(jobId);
  const updateQuestionMutation = useUpdateQuestion(jobId);
  const deleteQuestionMutation = useDeleteQuestion(jobId);

  const { data: templatesData } = useTemplates();
  const allTemplates = templatesData?.data ?? [];
  const offerTemplates = allTemplates.filter((t) => t.type === "offer");
  const emailTemplates = allTemplates.filter((t) => t.type === "rejection");

  const { data: allAssessmentsData } = useAssessments();
  const { data: jobAssessmentsData } = useJobAssessments(jobId);
  const attachAssessmentMutation = useAttachAssessment(jobId);
  const detachAssessmentMutation = useDetachAssessment(jobId);

  const { data: teamData } = useHiringTeam(jobId);
  const { data: allUsersData } = useUsers();
  const team = teamData?.data ?? [];
  const allUsers = allUsersData?.data ?? [];
  const addTeamMemberMutation = useAddHiringTeamMember(jobId);
  const removeTeamMemberMutation = useRemoveHiringTeamMember(jobId);

  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const [newMemberRole, setNewMemberRole] = useState("hiring_manager");
  const [newMemberId, setNewMemberId] = useState("");

  const handleAddTeamMember = () => {
    if (!newMemberId) return;
    addTeamMemberMutation.mutate(
      { userId: Number(newMemberId), role: newMemberRole },
      {
        onSuccess: () => {
          setAddTeamMemberOpen(false);
          setNewMemberId("");
        },
      },
    );
  };

  const allAssessments = allAssessmentsData?.data ?? [];
  const attachedAssessments = jobAssessmentsData?.data ?? [];

  const job = jobData?.data;
  const me = meData?.data;
  const canManageJob =
    !!me &&
    !!job &&
    (me.role === "super_admin" ||
      (me.role === "hiring_manager" && me.id === job.createdBy));
  const allMessages = useMemo(() => {
    const history = chatHistoryData?.data ?? [];
    const merged = [...history, ...liveMessages];
    const byId = new Map<number, (typeof merged)[number]>();
    for (const msg of merged) byId.set(msg.id, msg);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    );
  }, [chatHistoryData?.data, liveMessages]);

  const handleSendNote = () => {
    if (!noteText.trim() || !me) return;
    sendMessage(me.id, noteText.trim());
    setNoteText("");
  };

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<{
    id: number;
    senderName: string | null;
    message: string | null;
  } | null>(null);

  const [questions, setQuestions] = useState<CustomQuestion[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<
    "short_answer" | "long_answer" | "checkbox" | "radio"
  >("short_answer");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  useEffect(() => {
    if (customQuestionsData?.data) {
      setQuestions(customQuestionsData.data);
    }
  }, [customQuestionsData]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLgUp(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isResizingNotes) return;

    const MIN = 360;
    const MAX = 700;

    const onMove = (e: MouseEvent) => {
      const next = Math.round(window.innerWidth - e.clientX);
      setNotesPanelWidth(Math.max(MIN, Math.min(MAX, next)));
    };

    const onUp = () => setIsResizingNotes(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingNotes]);

  // ── Inline edit state ────────────────────────────────────────────────────
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingStageName, setEditingStageName] = useState("");

  const handleSaveStage = (stageId: number) => {
    if (!editingStageName.trim()) return;
    updateStageMutation.mutate(
      { stageId, data: { name: editingStageName.trim() } },
      { onSuccess: () => setEditingStageId(null) },
    );
  };

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState<
    "short_answer" | "long_answer" | "checkbox" | "radio"
  >("short_answer");
  const [editQuestionRequired, setEditQuestionRequired] = useState(false);

  const openEditQuestion = (q: CustomQuestion) => {
    setEditingQuestionId(q.id);
    setEditQuestionText(q.title);
    setEditQuestionType(q.questionType);
    setEditQuestionRequired(q.isRequired);
  };

  const handleSaveQuestion = (questionId: number) => {
    if (!editQuestionText.trim()) return;
    updateQuestionMutation.mutate(
      {
        questionId,
        data: {
          title: editQuestionText.trim(),
          questionType: editQuestionType,
          isRequired: editQuestionRequired,
        },
      },
      { onSuccess: () => setEditingQuestionId(null) },
    );
  };

  // ── Hiring Process stage state ───────────────────────────────────────────
  const [stages, setStages] = useState<(PipelineStage & { color: string })[]>(
    [],
  );

  useEffect(() => {
    if (pipelineData?.data) {
      setStages(
        [...pipelineData.data]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((s) => ({
            ...s,
            color: STAGE_COLORS[s.stageType] ?? "bg-slate-400",
          })),
      );
    }
  }, [pipelineData]);

  // Configure Stage dialog
  const [configOpen, setConfigOpen] = useState(false);
  const [configStage, setConfigStage] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [configType, setConfigType] = useState<"offer" | "rejection" | "none">(
    "none",
  );
  const [configOfferTemplate, setConfigOfferTemplate] = useState("");
  const [configMode, setConfigMode] = useState("");
  const [configExpiry, setConfigExpiry] = useState("");
  const [configRejectTemplate, setConfigRejectTemplate] = useState("");

  const openConfigure = (stage: PipelineStage & { color: string }) => {
    setConfigStage({ id: stage.id, name: stage.name });
    setConfigType(
      stage.stageType === "offer" || stage.stageType === "rejection"
        ? stage.stageType
        : "none",
    );
    setConfigOfferTemplate(
      stage.offerTemplateId ? String(stage.offerTemplateId) : "",
    );
    setConfigMode(stage.offerMode ?? "");
    setConfigExpiry(stage.offerExpiryDays ? String(stage.offerExpiryDays) : "");
    setConfigRejectTemplate(
      stage.rejectionTemplateId ? String(stage.rejectionTemplateId) : "",
    );
    setConfigOpen(true);
  };

  const [addStageOpen, setAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [detachTarget, setDetachTarget] = useState<number | null>(null);
  const [stageDeleteTarget, setStageDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [assessmentSelectId, setAssessmentSelectId] = useState("");
  const [triggerStageSelectId, setTriggerStageSelectId] = useState("");

  const QUESTION_TYPE_LABELS: Record<string, string> = {
    short_answer: "Short Answer",
    long_answer: "Long Answer",
    checkbox: "Checkbox",
    radio: "Radio Button",
  };
  const MEMBER_ROLE_LABELS: Record<string, string> = {
    hiring_manager: "Hiring Manager",
    interviewer: "Interviewer",
    recruiter: "Recruiter",
  };
  const OFFER_MODE_LABELS: Record<string, string> = {
    auto_draft: "Auto-Draft",
    auto_send: "Auto-Send",
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const nextPosition =
      stages.length === 0
        ? 1
        : Math.max(...stages.map((s) => s.position ?? 0)) + 1;
    createStageMutation.mutate(
      {
        name: newStageName.trim(),
        position: nextPosition,
        stageType: "none",
      },
      {
        onSuccess: () => {
          setNewStageName("");
          setAddStageOpen(false);
        },
      },
    );
  };

  function moveItem<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  const stageReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const questionReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStageReorder = (from: number, to: number) => {
    const reordered = moveItem(stages, from, to).map((stage, index) => ({
      ...stage,
      position: index + 1,
    }));
    setStages(reordered);

    // Debounce the backend updates to avoid conflicts
    if (stageReorderTimeoutRef.current) {
      clearTimeout(stageReorderTimeoutRef.current);
    }

    stageReorderTimeoutRef.current = setTimeout(() => {
      // Use bulk reorder API to update all positions in a single transaction
      const stageUpdates = reordered.map((stage) => ({
        id: stage.id,
        position: stage.position,
      }));

      reorderStagesMutation.mutate(stageUpdates);
    }, 500);
  };

  const handleQuestionReorder = (from: number, to: number) => {
    const reordered = moveItem(questions, from, to);
    setQuestions(reordered);

    // Debounce the backend updates
    if (questionReorderTimeoutRef.current) {
      clearTimeout(questionReorderTimeoutRef.current);
    }

    questionReorderTimeoutRef.current = setTimeout(() => {
      // Update positions for all affected questions
      reordered.forEach((question, index) => {
        const newPosition = index + 1;
        if (question.position !== newPosition) {
          updateQuestionMutation.mutate({
            questionId: question.id,
            data: { position: newPosition },
          });
        }
      });
    }, 500);
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <div
        className="flex flex-1 flex-col bg-white dark:bg-neutral-950 overflow-y-auto relative"
        style={
          isNotesOpen && isLgUp
            ? { paddingRight: `${notesPanelWidth}px` }
            : undefined
        }
      >
        <div className="px-8 pt-6 pb-0 max-w-full 2xl:max-w-400 w-full mx-auto">
          <div className="mb-4">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-theme hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Back to Job Listing
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-2">
            {/* Left Column: Job Info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="text-[32px] font-semibold text-slate-900 dark:text-neutral-100 tracking-tight leading-none">
                  {jobLoading ? "Loading..." : (job?.title ?? "Job Not Found")}
                </h1>
                {job && STATUS_BADGE[job.status] && (
                  <Badge
                    className={`${STATUS_BADGE[job.status].bg} ${STATUS_BADGE[job.status].text} hover:opacity-90 border-none font-semibold px-3 py-1 rounded-md text-[11px] shadow-none uppercase tracking-wider`}
                  >
                    {STATUS_BADGE[job.status].label}
                  </Badge>
                )}
              </div>

              {job && (
                <div className="flex flex-wrap items-center text-[15px] font-medium text-slate-500 dark:text-neutral-400 gap-x-4 gap-y-2">
                  <span>{EMPLOYMENT_LABELS[job.employmentType]}</span>
                  {job.location && (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-neutral-600"></div>
                      <span>{job.location}</span>
                    </>
                  )}
                  {formatSalary(job) && (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-neutral-600"></div>
                      <span className="text-slate-800 dark:text-neutral-200 font-medium">
                        {formatSalary(job)}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center gap-4">
                <Link
                  href={`/careers/${jobId}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-theme bg-(--theme-color)/5 hover:bg-theme/10 px-3 py-1.5 rounded-md text-[14px] font-semibold transition-colors w-fit"
                >
                  <HugeiconsIcon icon={Link01Icon} className="size-4" />
                  <span>
                    {typeof window !== "undefined" &&
                      `${window.location.host}/careers/${jobId}`}
                  </span>
                </Link>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[14px] transition-colors">
                  <span className="font-semibold text-slate-900 dark:text-neutral-100 leading-none tabular-nums">
                    {jobCandidatesPending ? "…" : jobCandidateCount}
                  </span>
                  <span className="text-slate-600 dark:text-neutral-400 font-medium leading-none">
                    {jobCandidateCount === 1 && !jobCandidatesPending
                      ? "Candidate"
                      : "Candidates"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className="flex items-center gap-3 shrink-0 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsNotesOpen(!isNotesOpen)}
                className="border-slate-200 cursor-pointer dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-neutral-100 rounded-lg h-11 px-5 font-medium gap-2.5"
              >
                <HugeiconsIcon
                  icon={Chatting01Icon}
                  className="size-4.5"
                  strokeWidth={2}
                />
                <span>Discussions</span>
              </Button>
              <Link href={`/jobs/${jobId}/pipeline`}>
                <Button className="bg-theme hover:bg-theme-hover cursor-pointer text-white rounded-lg h-11 px-7 font-medium border-none gap-2">
                  <span>Hiring Pipeline</span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4"
                    strokeWidth={3}
                  />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="w-full border-y border-slate-100 dark:border-neutral-800 py-3 bg-white dark:bg-neutral-950 shadow-none">
            <div className="px-8 max-w-full 2xl:max-w-400 w-full mx-auto">
              <TabsList className="bg-transparent w-full justify-start rounded-none h-auto p-0 gap-3">
                <TabsTrigger
                  value="overview"
                  className={cn(JOB_TAB_TRIGGER_CLASS, "h-9.5", JOB_TAB_PRESS)}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="hiring-team"
                  className={cn(
                    JOB_TAB_TRIGGER_CLASS,
                    "h-[38px]",
                    JOB_TAB_PRESS,
                  )}
                >
                  Hiring Team
                </TabsTrigger>
                <TabsTrigger
                  value="hiring-process"
                  className={cn(
                    JOB_TAB_TRIGGER_CLASS,
                    "h-[38px]",
                    JOB_TAB_PRESS,
                  )}
                >
                  Hiring Process
                </TabsTrigger>
                <TabsTrigger
                  value="custom-questions"
                  className={cn(
                    JOB_TAB_TRIGGER_CLASS,
                    "h-[38px]",
                    JOB_TAB_PRESS,
                  )}
                >
                  Custom Questions
                </TabsTrigger>
                <TabsTrigger
                  value="assessments"
                  className={cn(
                    JOB_TAB_TRIGGER_CLASS,
                    "h-[38px]",
                    JOB_TAB_PRESS,
                  )}
                >
                  Assessments
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="px-8 pb-20 w-full">
            <TabsContent
              value="overview"
              className="pt-10 animate-in fade-in duration-300 max-w-4xl"
            >
              {jobLoading ? (
                <p className="text-slate-400 dark:text-neutral-500 text-[15px]">
                  Loading...
                </p>
              ) : job?.description ? (
                <div
                  className="whitespace-pre-line text-slate-600 dark:text-neutral-300 leading-relaxed text-[15px] [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:font-semibold [&_h2]:text-slate-800 dark:[&_h2]:text-neutral-100 [&_h2]:mb-2 [&_h3]:font-medium [&_h3]:text-slate-700 dark:[&_h3]:text-neutral-200 [&_h3]:mb-1"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              ) : (
                <p className="text-slate-400 dark:text-neutral-500 text-[15px]">
                  No description provided.
                </p>
              )}
            </TabsContent>

            <TabsContent
              value="hiring-team"
              className="pt-10 space-y-12 animate-in fade-in duration-300"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 dark:text-neutral-400 font-medium text-[15px]">
                    Team Members
                  </span>
                  {canManageJob && (
                    <Dialog
                      open={addTeamMemberOpen}
                      onOpenChange={setAddTeamMemberOpen}
                    >
                      <DialogTrigger
                        render={
                          <button className="flex items-center cursor-pointer gap-2 text-theme hover:underline font-medium text-[14px]" />
                        }
                      >
                        <HugeiconsIcon
                          icon={PlusSignIcon}
                          className="size-3.5"
                          strokeWidth={3}
                        />
                        <span>Add New Member</span>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Team Member</DialogTitle>
                          <DialogDescription>
                            Assign a user to this job&apos;s hiring team.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>Select User</Label>
                            <Select
                              value={newMemberId}
                              onValueChange={(value) =>
                                setNewMemberId(value ?? "")
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select user">
                                  {newMemberId
                                    ? (() => {
                                        const u = allUsers.find(
                                          (u) =>
                                            u.id.toString() === newMemberId,
                                        );
                                        return u
                                          ? `${u.firstName} ${u.lastName}`
                                          : null;
                                      })()
                                    : null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {allUsers
                                  .filter(
                                    (u) => !team.some((t) => t.id === u.id),
                                  )
                                  .map((u) => (
                                    <SelectItem
                                      key={u.id}
                                      value={u.id.toString()}
                                    >
                                      {u.firstName} {u.lastName} ({u.role})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Role Context</Label>
                            <Select
                              value={newMemberRole}
                              onValueChange={(value) =>
                                setNewMemberRole(value ?? "hiring_manager")
                              }
                            >
                              <SelectTrigger>
                                <SelectValue>
                                  {MEMBER_ROLE_LABELS[newMemberRole] ??
                                    newMemberRole}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hiring_manager">
                                  Hiring Manager
                                </SelectItem>
                                <SelectItem value="interviewer">
                                  Interviewer
                                </SelectItem>
                                <SelectItem value="recruiter">
                                  Recruiter
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setAddTeamMemberOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={
                              !newMemberId || addTeamMemberMutation.isPending
                            }
                            onClick={handleAddTeamMember}
                            className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white"
                          >
                            {addTeamMemberMutation.isPending
                              ? "Adding..."
                              : "Add Member"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {team.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    No members assigned to this job.
                  </p>
                ) : (
                  team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.firstName}
                            className="size-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-11 rounded-full bg-[var(--theme-color)] flex items-center justify-center text-white font-medium text-sm overflow-hidden">
                            {member.firstName.charAt(0)}
                            {member.lastName.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-slate-700 dark:text-neutral-300 font-medium text-[15px]">
                            {member.firstName} {member.lastName}
                          </span>
                          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                            {member.role?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      {canManageJob && (
                        <button
                          onClick={() =>
                            removeTeamMemberMutation.mutate(member.id)
                          }
                          disabled={removeTeamMemberMutation.isPending}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove Member"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-5"
                          />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="hiring-process"
              className="pt-10 space-y-6 animate-in fade-in duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-slate-900 dark:text-neutral-100 font-semibold text-[17px]">
                    Hiring Pipeline Stages
                  </h3>
                  <p className="text-slate-500 dark:text-neutral-400 text-[13px]">
                    Drag To Reorder Stages. Click To Edit Or Remove.
                  </p>
                </div>
                {canManageJob && (
                  <Button
                    onClick={() => {
                      setNewStageName("");
                      setAddStageOpen(true);
                    }}
                    className="bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-4 font-medium shadow-none border-none gap-2 text-sm"
                  >
                    <HugeiconsIcon
                      icon={PlusSignIcon}
                      className="size-4"
                      strokeWidth={3}
                    />
                    <span>Add New Stage</span>
                  </Button>
                )}
              </div>

              <div className="space-y-2 pt-4">
                {stages.map((stage, index) => {
                  function StageDraggable() {
                    const { ref, isDragging, isOver } = useDragSort({
                      id: stage.id,
                      index,
                      type: "HIRING_STAGE",
                      onMove: handleStageReorder,
                    });
                    return (
                      <div
                        ref={ref as Ref<HTMLDivElement>}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-all group bg-white dark:bg-neutral-900 ${
                          isDragging
                            ? "opacity-40 border-slate-300 dark:border-neutral-700"
                            : isOver
                              ? "border-[var(--theme-color)]/40 bg-[var(--theme-color)]/5"
                              : "border-slate-200/70 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <HugeiconsIcon
                            icon={DragDropVerticalIcon}
                            className="size-5 text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                          />
                          <div
                            className={`size-2 rounded-full ${stage.color} shrink-0`}
                          />
                          {editingStageId === stage.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                autoFocus
                                value={editingStageName}
                                onChange={(e) =>
                                  setEditingStageName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveStage(stage.id);
                                  if (e.key === "Escape")
                                    setEditingStageId(null);
                                }}
                                className="h-8 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 text-[14px] w-48"
                              />
                              <button
                                onClick={() => handleSaveStage(stage.id)}
                                disabled={updateStageMutation.isPending}
                                className="text-xs font-medium text-white bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] px-3 h-8 rounded-md disabled:opacity-50"
                              >
                                {updateStageMutation.isPending
                                  ? "Saving…"
                                  : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingStageId(null)}
                                className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 px-3 h-8 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-700 dark:text-neutral-200 font-medium text-[15px]">
                              {stage.name}
                            </span>
                          )}
                        </div>
                        {canManageJob && editingStageId !== stage.id && (
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => openConfigure(stage)}
                              className="text-[var(--theme-color)]/60 cursor-pointer hover:text-[var(--theme-color)] transition-colors"
                              title="Configure Stage"
                            >
                              <HugeiconsIcon
                                icon={Settings02Icon}
                                className="size-[18px]"
                              />
                            </button>
                            <button
                              onClick={() => {
                                setEditingStageId(stage.id);
                                setEditingStageName(stage.name);
                              }}
                              className="text-[var(--theme-color)]/60 cursor-pointer hover:text-[var(--theme-color)] transition-colors"
                            >
                              <HugeiconsIcon
                                icon={PencilEdit01Icon}
                                className="size-[18px]"
                              />
                            </button>
                            <button
                              onClick={() =>
                                setStageDeleteTarget({
                                  id: stage.id,
                                  name: stage.name,
                                })
                              }
                              disabled={deleteStageMutation.isPending}
                              className="text-red-400/80 cursor-pointer hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-[18px]"
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return <StageDraggable key={stage.id} />;
                })}
              </div>

              <AlertDialog
                open={stageDeleteTarget !== null}
                onOpenChange={(o) => !o && setStageDeleteTarget(null)}
              >
                <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
                      Delete this stage?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[14px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      This will permanently delete{" "}
                      <span className="font-medium">
                        {stageDeleteTarget?.name ?? "this stage"}
                      </span>
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="h-10 px-6 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[14px] font-medium shadow-none  cursor-pointer">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (!stageDeleteTarget) return;
                        deleteStageMutation.mutate(stageDeleteTarget.id, {
                          onSuccess: () => setStageDeleteTarget(null),
                        });
                      }}
                      disabled={
                        deleteStageMutation.isPending || !stageDeleteTarget
                      }
                      className="h-10 px-6 rounded-md bg-red-700 hover:bg-red-800 text-white text-[14px] font-medium shadow-none border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {deleteStageMutation.isPending ? (
                        <span className="inline-flex items-center gap-2">
                          <Spinner className="text-white" />
                          Deleting…
                        </span>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            <TabsContent
              value="custom-questions"
              className="pt-10 space-y-8 animate-in fade-in duration-300"
            >
              <div className="flex flex-col gap-6">
                {canManageJob && (
                  <button
                    onClick={() => setIsAddingMode(true)}
                    className="flex items-center cursor-pointer gap-2 text-[var(--theme-color)] hover:underline font-medium text-[15px] w-fit"
                  >
                    <HugeiconsIcon
                      icon={PlusSignIcon}
                      className="size-4"
                      strokeWidth={3}
                    />
                    <span>Add Custom Question</span>
                  </button>
                )}

                <div className="space-y-3">
                  {questions.map((q, index) => {
                    function QuestionDraggable() {
                      const { ref, isDragging, isOver } = useDragSort({
                        id: q.id,
                        index,
                        type: "CUSTOM_QUESTION",
                        onMove: handleQuestionReorder,
                      });
                      return (
                        <div
                          ref={ref as Ref<HTMLDivElement>}
                          className={`group relative border rounded-lg bg-white dark:bg-neutral-900 transition-all ${
                            isDragging
                              ? "opacity-40 border-slate-300 dark:border-neutral-700"
                              : isOver
                                ? "border-[var(--theme-color)]/40 bg-[var(--theme-color)]/5"
                                : "border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                          }`}
                        >
                          {editingQuestionId === q.id ? (
                            <div className="p-3 space-y-4 animate-in fade-in duration-150">
                              <div className="flex flex-wrap items-center gap-4">
                                <Select
                                  value={editQuestionType}
                                  onValueChange={(val) =>
                                    setEditQuestionType(
                                      val as
                                        | "short_answer"
                                        | "long_answer"
                                        | "checkbox"
                                        | "radio",
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-[180px] h-10! min-h-10 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-0 text-[15px] text-slate-600 dark:text-neutral-300 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600">
                                    <SelectValue>
                                      {QUESTION_TYPE_LABELS[editQuestionType] ??
                                        editQuestionType}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
                                    <SelectItem value="short_answer">
                                      <div className="flex items-center gap-2">
                                        <HugeiconsIcon
                                          icon={TextIcon}
                                          className="size-4"
                                        />
                                        <span>Short Answer</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="long_answer">
                                      <div className="flex items-center gap-2">
                                        <HugeiconsIcon
                                          icon={ParagraphIcon}
                                          className="size-4"
                                        />
                                        <span>Long Answer</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="checkbox">
                                      <div className="flex items-center gap-2">
                                        <HugeiconsIcon
                                          icon={Tick02Icon}
                                          className="size-4"
                                        />
                                        <span>Checkbox</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="radio">
                                      <div className="flex items-center gap-2">
                                        <HugeiconsIcon
                                          icon={CircleIcon}
                                          className="size-4"
                                        />
                                        <span>Radio Button</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  autoFocus
                                  placeholder="Enter the question here"
                                  value={editQuestionText}
                                  onChange={(e) =>
                                    setEditQuestionText(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSaveQuestion(q.id);
                                    if (e.key === "Escape")
                                      setEditingQuestionId(null);
                                  }}
                                  className="flex-1 h-10 min-h-10 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 shadow-none   text-[15px]"
                                />
                                <div className="flex items-center gap-2 px-2">
                                  <Checkbox
                                    id={`edit-required-${q.id}`}
                                    checked={editQuestionRequired}
                                    onCheckedChange={(v) =>
                                      setEditQuestionRequired(!!v)
                                    }
                                    className="size-4 shrink-0 border-slate-300 data-[state=checked]:bg-[var(--theme-color)] data-[state=checked]:border-[var(--theme-color)]"
                                  />
                                  <Label
                                    htmlFor={`edit-required-${q.id}`}
                                    className="text-slate-600 dark:text-neutral-300 font-medium text-[15px] cursor-pointer"
                                  >
                                    Required
                                  </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setEditingQuestionId(null)}
                                    className="h-10 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium shadow-none"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    disabled={
                                      !editQuestionText.trim() ||
                                      updateQuestionMutation.isPending
                                    }
                                    onClick={() => handleSaveQuestion(q.id)}
                                    className="h-10 px-6 cursor-pointer bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none rounded-lg font-medium disabled:opacity-50"
                                  >
                                    {updateQuestionMutation.isPending
                                      ? "Saving…"
                                      : "Save Changes"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                                  {q.questionType === "short_answer" && (
                                    <HugeiconsIcon
                                      icon={TextIcon}
                                      className="size-4"
                                    />
                                  )}
                                  {q.questionType === "long_answer" && (
                                    <HugeiconsIcon
                                      icon={ParagraphIcon}
                                      className="size-4"
                                    />
                                  )}
                                  {q.questionType === "checkbox" && (
                                    <HugeiconsIcon
                                      icon={Tick02Icon}
                                      className="size-4"
                                    />
                                  )}
                                  {q.questionType === "radio" && (
                                    <HugeiconsIcon
                                      icon={CircleIcon}
                                      className="size-4"
                                    />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-700 dark:text-neutral-200 font-medium text-[15px]">
                                    {q.title}
                                  </span>
                                  {q.isRequired && (
                                    <span className="text-[11px] text-red-500 font-medium">
                                      Required
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => openEditQuestion(q)}
                                  className="p-1.5 text-slate-400 hover:text-[var(--theme-color)] transition-colors"
                                >
                                  <HugeiconsIcon
                                    icon={PencilEdit01Icon}
                                    className="size-[18px]"
                                  />
                                </button>
                                <button
                                  onClick={() =>
                                    deleteQuestionMutation.mutate(q.id)
                                  }
                                  disabled={deleteQuestionMutation.isPending}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                >
                                  <HugeiconsIcon
                                    icon={Delete02Icon}
                                    className="size-[18px]"
                                  />
                                </button>
                                <button className="p-1.5 text-slate-300 cursor-grab active:cursor-grabbing">
                                  <HugeiconsIcon
                                    icon={DragDropVerticalIcon}
                                    className="size-[18px]"
                                  />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return <QuestionDraggable key={q.id} />;
                  })}

                  {isAddingMode && (
                    <div className="p-3 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-wrap items-center gap-4">
                        <Select
                          value={newQuestionType}
                          onValueChange={(val) =>
                            setNewQuestionType(
                              val as
                                | "short_answer"
                                | "long_answer"
                                | "checkbox"
                                | "radio",
                            )
                          }
                        >
                          <SelectTrigger className="w-[180px] h-10! min-h-10 cursor-pointer rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-0 text-[15px] text-slate-600 dark:text-neutral-300 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600">
                            <SelectValue placeholder="Question Type">
                              {QUESTION_TYPE_LABELS[newQuestionType] ??
                                newQuestionType}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
                            <SelectItem value="short_answer">
                              <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                  icon={TextIcon}
                                  className="size-4"
                                />
                                <span>Short Answer</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="long_answer">
                              <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                  icon={ParagraphIcon}
                                  className="size-4"
                                />
                                <span>Long Answer</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="checkbox">
                              <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                  icon={Tick02Icon}
                                  className="size-4"
                                />
                                <span>Checkbox</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="radio">
                              <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                  icon={CircleIcon}
                                  className="size-4"
                                />
                                <span>Radio Button</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Enter the question here"
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          className="flex-1 h-10 min-h-10 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-neutral-600 text-[15px]"
                        />

                        {(newQuestionType === "radio" ||
                          newQuestionType === "checkbox") && (
                          <Dialog>
                            <DialogTrigger
                              render={
                                <Button
                                  variant="outline"
                                  className="h-10 border-[var(--theme-color)] text-[var(--theme-color)] hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium px-4 shadow-none gap-2"
                                />
                              }
                            >
                              <HugeiconsIcon
                                icon={Settings02Icon}
                                className="size-4"
                              />
                              <span>Setup Options & Logic</span>
                            </DialogTrigger>
                            <DialogContent className="max-w-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
                              <DialogHeader>
                                <DialogTitle className="text-slate-900 dark:text-neutral-100">
                                  Setup Question Logic
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-neutral-400">
                                  Add options and define the logic for this
                                  question.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label className="text-slate-700 dark:text-neutral-300">
                                    Options
                                  </Label>
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="Option 1"
                                        className="h-9 bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus-visible:ring-0"
                                      />
                                      <Button
                                        variant="ghost"
                                        className="size-9 p-0 text-red-500"
                                      >
                                        <HugeiconsIcon
                                          icon={Delete02Icon}
                                          className="size-4"
                                        />
                                      </Button>
                                    </div>
                                    <button className="text-[var(--theme-color)] text-sm font-medium hover:underline flex items-center gap-1">
                                      <HugeiconsIcon
                                        icon={PlusSignIcon}
                                        className="size-3"
                                        strokeWidth={3}
                                      />
                                      <span>Add Another Option</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium px-5">
                                  Save Logic
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        <div className="flex items-center gap-2 px-2">
                          <Checkbox
                            id="required"
                            checked={newQuestionRequired}
                            onCheckedChange={(v) => setNewQuestionRequired(!!v)}
                            className="size-4 shrink-0 cursor-pointer border-slate-300 data-[state=checked]:bg-[var(--theme-color)] data-[state=checked]:border-[var(--theme-color)]"
                          />
                          <Label
                            htmlFor="required"
                            className="text-slate-600 dark:text-neutral-300 font-medium text-[15px] cursor-pointer"
                          >
                            Required
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsAddingMode(false);
                              setNewQuestionText("");
                              setNewQuestionRequired(false);
                            }}
                            className="h-10 px-6 border-slate-200 cursor-pointer dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={
                              !newQuestionText.trim() ||
                              createQuestionMutation.isPending
                            }
                            className="h-10 px-6 bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white shadow-none rounded-lg font-medium disabled:opacity-50"
                            onClick={() => {
                              if (!newQuestionText.trim()) return;
                              createQuestionMutation.mutate(
                                {
                                  title: newQuestionText.trim(),
                                  questionType: newQuestionType,
                                  isRequired: newQuestionRequired,
                                  position: questions.length + 1,
                                },
                                {
                                  onSuccess: () => {
                                    setIsAddingMode(false);
                                    setNewQuestionText("");
                                    setNewQuestionRequired(false);
                                    setNewQuestionType("short_answer");
                                  },
                                },
                              );
                            }}
                          >
                            {createQuestionMutation.isPending
                              ? "Adding..."
                              : "Add Question"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button className="bg-[var(--theme-color)] cursor-pointer hover:bg-[var(--theme-color-hover)] text-white rounded-lg h-10 px-6 font-medium shadow-none">
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assessments" className="pt-8 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[18px] font-semibold text-slate-900 dark:text-neutral-100">
                    Automated Assessments
                  </p>
                  <p className="text-[13px] text-slate-400 dark:text-neutral-500 mt-1">
                    Sent automatically when a candidate reaches the trigger
                    stage.
                  </p>
                </div>
                <Dialog
                  open={isAssessmentDialogOpen}
                  onOpenChange={(open) => {
                    setIsAssessmentDialogOpen(open);
                    if (!open) {
                      setAssessmentSelectId("");
                      setTriggerStageSelectId("");
                    }
                  }}
                >
                  <DialogTrigger
                    render={
                      <Button className="inline-flex cursor-pointer items-center gap-2 h-10 px-5 rounded-lg text-[13px] font-medium border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-800 dark:hover:text-neutral-100 transition-colors">
                        <HugeiconsIcon
                          icon={PlusSignIcon}
                          className="size-4"
                          strokeWidth={2.5}
                        />
                        Attach Assessment
                      </Button>
                    }
                  />
                  <DialogContent className="!top-[18%] !translate-y-0 max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-6 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-[16px] font-semibold text-slate-900 dark:text-neutral-100">
                        Attach Assessment
                      </DialogTitle>
                      <DialogDescription className="text-slate-400 dark:text-neutral-500 text-[13px] mt-1">
                        Auto-send when a candidate enters the selected stage.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const assessmentId = Number(
                          formData.get("assessmentId"),
                        );
                        const triggerStageId = Number(
                          formData.get("triggerStageId"),
                        );
                        if (assessmentId && triggerStageId) {
                          attachAssessmentMutation.mutate(
                            { assessmentId, triggerStageId },
                            {
                              onSuccess: () => setIsAssessmentDialogOpen(false),
                            },
                          );
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                          Assessment
                        </Label>
                        <Select
                          name="assessmentId"
                          value={assessmentSelectId}
                          onValueChange={(value) =>
                            setAssessmentSelectId(value ?? "")
                          }
                          required
                        >
                          <SelectTrigger className="w-full h-9 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-none rounded-lg text-[13px] text-slate-600 dark:text-neutral-300 focus:ring-0">
                            <SelectValue placeholder="Choose assessment…">
                              {assessmentSelectId
                                ? (allAssessments.find(
                                    (a) =>
                                      a.id.toString() === assessmentSelectId,
                                  )?.title ?? null)
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                            {allAssessments.map((a) => (
                              <SelectItem
                                key={a.id}
                                value={a.id.toString()}
                                className="text-[13px]"
                              >
                                {a.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                          Trigger Stage
                        </Label>
                        <Select
                          name="triggerStageId"
                          value={triggerStageSelectId}
                          onValueChange={(value) =>
                            setTriggerStageSelectId(value ?? "")
                          }
                          required
                        >
                          <SelectTrigger className="w-full h-9 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-none rounded-lg text-[13px] text-slate-600 dark:text-neutral-300 focus:ring-0">
                            <SelectValue placeholder="When candidate moves into…">
                              {triggerStageSelectId
                                ? (stages.find(
                                    (s) =>
                                      s.id.toString() === triggerStageSelectId,
                                  )?.name ?? null)
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                            {stages.map((s) => (
                              <SelectItem
                                key={s.id}
                                value={s.id.toString()}
                                className="text-[13px]"
                              >
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={attachAssessmentMutation.isPending}
                          className="h-9 px-5 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg text-[13px] font-medium"
                        >
                          {attachAssessmentMutation.isPending
                            ? "Saving…"
                            : "Save"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {attachedAssessments.length > 0 ? (
                <div className="space-y-3">
                  {attachedAssessments.map((attachment) => {
                    const stageFound = stages.find(
                      (s) => s.id === attachment.triggerStageId,
                    );
                    const assessmentFound = allAssessments.find(
                      (a) => a.id === attachment.assessmentId,
                    );
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between px-5 py-4 bg-white dark:bg-neutral-900 border border-[var(--theme-color)]/20 hover:border-[var(--theme-color)]/40 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0 text-[18px]">
                            📋
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-slate-800 dark:text-neutral-200 truncate">
                              {assessmentFound?.title ?? "Unknown Assessment"}
                            </p>
                            <p className="text-[12px] text-slate-400 mt-0.5">
                              Triggers on{" "}
                              <span className="font-medium text-slate-500">
                                {stageFound?.name ?? "Unknown Stage"}
                              </span>
                              {assessmentFound?.timeLimit
                                ? ` · ${assessmentFound.timeLimit} mins`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setDetachTarget(attachment.id)}
                          className="shrink-0 ml-4 cursor-pointer bg-red inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 transition-colors"
                        >
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            className="size-3.5"
                          />
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl">
                  <p className="text-[13px] text-slate-400 dark:text-neutral-500">
                    No assessments attached yet.
                  </p>
                  <button
                    onClick={() => setIsAssessmentDialogOpen(true)}
                    className="mt-2 cursor-pointer text-[12px] font-medium text-[var(--theme-color)] hover:underline"
                  >
                    Attach one
                  </button>
                </div>
              )}

              <AlertDialog
                open={detachTarget !== null}
                onOpenChange={(o) => !o && setDetachTarget(null)}
              >
                <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
                      Remove this assessment?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      Candidates moved to this stage will no longer receive the
                      assessment automatically.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="h-10 px-6 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[14px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (detachTarget !== null) {
                          detachAssessmentMutation.mutate(detachTarget, {
                            onSuccess: () => setDetachTarget(null),
                          });
                        }
                      }}
                      disabled={detachAssessmentMutation.isPending}
                      className="h-10 px-6 rounded-md bg-red-700 hover:bg-red-800 text-white text-[14px] font-medium shadow-none border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {detachAssessmentMutation.isPending
                        ? "Removing…"
                        : "Remove"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>
          </div>
        </Tabs>

        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="!top-[12%] !translate-y-0 flex max-h-[min(700px,88vh)] min-h-[min(700px,78vh)] w-full max-w-2xl sm:max-w-2xl flex-col rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-8 gap-0 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
            <DialogHeader className="mb-0 shrink-0 pb-5">
              <DialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
                Configure Stage
              </DialogTitle>
            </DialogHeader>

            <div
              role="radiogroup"
              aria-label="Stage type"
              className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-slate-100 dark:border-neutral-800 pb-4"
            >
              {(["offer", "rejection", "none"] as const).map((t) => (
                <label
                  key={t}
                  className="inline-flex cursor-pointer select-none items-center gap-2.5"
                  onClick={() => setConfigType(t)}
                >
                  <span
                    className={`relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                      configType === t
                        ? "border-[var(--theme-color)]"
                        : "border-slate-300 dark:border-neutral-600"
                    }`}
                  >
                    {configType === t && (
                      <span className="size-2.5 shrink-0 rounded-full bg-[var(--theme-color)]" />
                    )}
                  </span>
                  <span
                    className={`text-[15px] font-medium leading-snug ${
                      configType === t
                        ? "text-[var(--theme-color)]"
                        : "text-slate-600 dark:text-neutral-400"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col py-6">
              {configType === "offer" && (
                <div className="flex flex-col gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 block">
                      Select Offer Template
                    </Label>
                    <Select
                      value={configOfferTemplate}
                      onValueChange={(val) => setConfigOfferTemplate(val || "")}
                    >
                      <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
                        <SelectValue placeholder="Select an offer template">
                          {configOfferTemplate
                            ? (offerTemplates.find(
                                (t) => String(t.id) === configOfferTemplate,
                              )?.name ?? null)
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="w-(--anchor-width) max-h-60 rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      >
                        {offerTemplates.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No offer templates found
                          </SelectItem>
                        ) : (
                          offerTemplates.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                    <div className="min-w-0 space-y-2.5">
                      <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 block">
                        Mode (auto-draft or auto-send)
                      </Label>
                      <Select
                        value={configMode}
                        onValueChange={(val) => setConfigMode(val || "")}
                      >
                        <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
                          <SelectValue placeholder="Select mode">
                            {configMode
                              ? (OFFER_MODE_LABELS[configMode] ?? configMode)
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          alignItemWithTrigger={false}
                          className="w-(--anchor-width) max-h-60 rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        >
                          <SelectItem value="auto_draft">Auto-Draft</SelectItem>
                          <SelectItem value="auto_send">Auto-Send</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0 space-y-2.5">
                      <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 block">
                        Expiry Days
                      </Label>
                      <Input
                        type="number"
                        value={configExpiry}
                        onChange={(e) => setConfigExpiry(e.target.value)}
                        className="h-10! min-h-10 w-full rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-0 text-sm shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {configType === "rejection" && (
                <div className="flex flex-col gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 block">
                      Select Rejection Email Template
                    </Label>
                    <Select
                      value={configRejectTemplate}
                      onValueChange={(val) =>
                        setConfigRejectTemplate(val || "")
                      }
                    >
                      <SelectTrigger className="w-full h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-3">
                        <SelectValue placeholder="Select a rejection email template">
                          {configRejectTemplate
                            ? (emailTemplates.find(
                                (t) => String(t.id) === configRejectTemplate,
                              )?.name ?? null)
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="w-(--anchor-width) max-h-60 rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                      >
                        {emailTemplates.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No rejection templates found
                          </SelectItem>
                        ) : (
                          emailTemplates.map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-auto shrink-0 gap-3 border-t border-slate-100 pt-6 dark:border-neutral-800 sm:pt-7">
              <Button
                variant="outline"
                onClick={() => setConfigOpen(false)}
                className="h-10 px-6 border-slate-200 cursor-pointer dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none rounded-md"
              >
                Cancel
              </Button>
              <Button
                disabled={updateStageMutation.isPending}
                onClick={() => {
                  if (!configStage) return;
                  updateStageMutation.mutate(
                    {
                      stageId: configStage.id,
                      data: {
                        stageType: configType,
                        offerTemplateId:
                          configType === "offer" && configOfferTemplate
                            ? Number(configOfferTemplate)
                            : null,
                        offerMode:
                          configType === "offer" && configMode
                            ? configMode
                            : null,
                        offerExpiryDays:
                          configType === "offer" && configExpiry
                            ? Number(configExpiry)
                            : null,
                        rejectionTemplateId:
                          configType === "rejection" && configRejectTemplate
                            ? Number(configRejectTemplate)
                            : null,
                      },
                    },
                    { onSuccess: () => setConfigOpen(false) },
                  );
                }}
                className="h-10 px-6 cursor-pointer bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-md border-none disabled:opacity-50"
              >
                {updateStageMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
          <DialogContent className="!top-[18%] !translate-y-0 max-w-[460px] rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg p-7 duration-0 data-open:zoom-in-100 data-closed:zoom-out-100">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-[19px] font-semibold text-slate-900 dark:text-neutral-100">
                Add New Stage
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-[13px] font-medium text-slate-700 dark:text-neutral-300 mb-1.5 block">
                  Stage Name
                </Label>
                <Input
                  autoFocus
                  placeholder="e.g., First Interview , Technical Interview"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                  className="h-10 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 rounded-md shadow-none focus-visible:ring-0 focus-visible:border-slate-300 text-[14px] placeholder:text-slate-300 dark:placeholder:text-neutral-600"
                />
              </div>
              <div className="text-[13px] text-slate-500 dark:text-neutral-400 space-y-0.5 pl-0.5">
                <p className="font-medium text-slate-600 dark:text-neutral-300 mb-1">
                  Tips:
                </p>
                <p>• Keep stage names short and descriptive</p>
                <p>• Use consistent naming conventions</p>
                <p>• Drag to reorder stages in the pipeline</p>
              </div>
            </div>

            <DialogFooter className="mt-5 gap-2">
              <Button
                variant="outline"
                onClick={() => setAddStageOpen(false)}
                className="h-10 px-6 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 font-medium shadow-none rounded-md"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddStage}
                disabled={!newStageName.trim() || createStageMutation.isPending}
                className="h-10 px-6 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white font-medium shadow-none rounded-md border-none disabled:opacity-50"
              >
                {createStageMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="text-white" />
                    Adding…
                  </span>
                ) : (
                  "Add Stage"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isNotesOpen && (
        <>
          <div
            className="fixed right-0 top-[var(--header-height)] h-[calc(100vh-var(--header-height))] w-full border-l border-t border-slate-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-950 z-50"
            style={{ width: isLgUp ? `${notesPanelWidth}px` : "100vw" }}
          >
            {/* Resize handle (desktop) */}
            <div
              className="hidden lg:block absolute left-0 top-0 h-full w-2 -translate-x-1 cursor-col-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingNotes(true);
              }}
              title="Drag to resize"
            />
            <div className="p-3 pl-5 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
                Team Discussions
              </h3>
              <button
                onClick={() => setIsNotesOpen(false)}
                className="text-slate-400 cursor-pointer dark:text-neutral-500 hover:text-slate-600 dark:hover:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 p-2 rounded-full transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-[20px]" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 bg-white dark:bg-neutral-950 scroll-smooth relative">
              {allMessages.length === 0 ? (
                <p className="text-slate-400 dark:text-neutral-500 text-[13px] text-center pt-8">
                  No notes yet. Be the first to add one.
                </p>
              ) : (
                allMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 p-4 rounded-lg w-full shadow-none"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-900 dark:text-neutral-100 font-semibold text-[14px] leading-tight truncate">
                        {msg.senderName ?? "Unknown"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 dark:text-neutral-500 text-[12px] font-medium">
                          {timeAgo(msg.sentAt)}
                        </span>
                        {me && msg.senderId === me.id && (
                          <>
                            <button
                              onClick={() => {
                                setEditingNoteId(msg.id);
                                setEditingNoteText(msg.message ?? "");
                              }}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Edit"
                              type="button"
                            >
                              <HugeiconsIcon
                                icon={PencilEdit01Icon}
                                className="size-4"
                              />
                            </button>
                            <button
                              onClick={() =>
                                setNoteDeleteTarget({
                                  id: msg.id,
                                  senderName: msg.senderName,
                                  message: msg.message,
                                })
                              }
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              title="Delete"
                              type="button"
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                className="size-4"
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                      {editingNoteId === msg.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-[14px] text-slate-700 dark:text-neutral-200 shadow-none focus:ring-1 focus:ring-[var(--theme-color)]/20 focus:border-[var(--theme-color)] outline-none resize-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteText("");
                              }}
                              className="h-9 px-4 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 shadow-none cursor-pointer"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (!me) return;
                                const next = editingNoteText.trim();
                                if (!next) return;
                                editMessage(me.id, msg.id, next);
                                setEditingNoteId(null);
                                setEditingNoteText("");
                              }}
                              disabled={!editingNoteText.trim()}
                              className="h-9 px-4 rounded-md bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none cursor-pointer disabled:opacity-50"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-700 dark:text-neutral-200 text-[14px] leading-relaxed">
                          {msg.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              {/* spacer to ensure input box at bottom doesn't hide text */}
              <div className="h-4 w-full"></div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
              <div className="flex items-center gap-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendNote();
                    }
                  }}
                  rows={1}
                  placeholder="Type a note and press Enter…"
                  className="flex-1 h-11 px-4 py-3 border border-slate-200 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 focus:ring-1 focus:ring-[var(--theme-color)]/20 focus:border-[var(--theme-color)] outline-none text-[14px] text-slate-700 dark:text-neutral-300 placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-all resize-none shadow-none leading-[1.2]"
                />
                <Button
                  onClick={handleSendNote}
                  disabled={!noteText.trim() || !me}
                  className="bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white rounded-md h-11 w-11 p-0 font-medium shadow-none border-none disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center"
                  aria-label="Send note"
                >
                  <HugeiconsIcon
                    icon={SentIcon}
                    className="size-4"
                    strokeWidth={3}
                  />
                </Button>
              </div>
            </div>
          </div>

          <AlertDialog
            open={noteDeleteTarget !== null}
            onOpenChange={(o) => !o && setNoteDeleteTarget(null)}
          >
            <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
                  Delete this note?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                  This will permanently remove the note.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="h-10 px-6 rounded-md border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 text-[14px] font-medium shadow-none hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!me || !noteDeleteTarget) return;
                    deleteMessage(me.id, noteDeleteTarget.id);
                    setNoteDeleteTarget(null);
                  }}
                  disabled={!me || !noteDeleteTarget}
                  className="h-10 px-6 rounded-md bg-red-700 hover:bg-red-800 text-white text-[14px] font-medium shadow-none border-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
