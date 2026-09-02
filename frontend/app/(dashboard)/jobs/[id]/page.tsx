"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { serverFetch } from "@/lib/auth-action";
import { Tabs } from "@/components/ui/tabs";
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

import { JobHeader } from "./_components/JobHeader";
import { JobTabs } from "./_components/JobTabs";
import { DiscussionsPanel } from "./_components/DiscussionsPanel";
import { AddStageDialog } from "./_components/dialogs/AddStageDialog";

import {
  useJob,
  useCustomQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useHiringTeam,
  useAddHiringTeamMember,
  useRemoveHiringTeamMember,
} from "@/hooks/queries/use-jobs";
import {
  usePipeline,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
} from "@/hooks/queries/use-pipeline";
import { useCandidates } from "@/hooks/queries/use-candidates";
import { useChatHistory } from "@/hooks/queries/use-chat";
import { useJobChat } from "@/hooks/use-job-chat";
import { useCurrentUser, useUsers } from "@/hooks/queries/use-user";
import {
  useAssessments,
  useJobAssessments,
  useAttachAssessment,
  useDetachAssessment,
} from "@/hooks/queries/use-assessments";

import type {
  PipelineStage,
  JobDetail,
  CustomQuestion,
  Candidate,
  User,
} from "@/types";

const STAGE_COLORS: Record<PipelineStage["stageType"], string> = {
  screening: "bg-amber-500",
  interview: "bg-blue-500",
  offer: "bg-green-500",
};

const JOB_TABS = [
  { value: "overview", label: "Overview" },
  { value: "hiring-team", label: "Hiring Team" },
  { value: "hiring-process", label: "Hiring Process" },
  { value: "custom-questions", label: "Custom Questions" },
  { value: "assessments", label: "Assessments" },
];

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

export default function JobDetailsPage() {
  const params = useParams();
  const jobId = Number(params.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;
    const prefetch = (key: QueryKey, url: string, staleTime: number) => {
      void queryClient.prefetchQuery({
        queryKey: key,
        queryFn: () => serverFetch(url),
        staleTime,
      });
    };

    prefetch(
      ["jobs", jobId, "pipeline"],
      `/jobs/${jobId}/pipeline`,
      1000 * 60 * 3,
    );
    prefetch(
      ["candidates", jobId, undefined],
      `/candidates/jobs/${jobId}`,
      1000 * 30,
    );
    prefetch(["jobs", jobId, "team"], `/jobs/${jobId}/team`, 1000 * 60 * 5);
    prefetch(
      ["jobs", jobId, "questions"],
      `/jobs/${jobId}/questions`,
      1000 * 60 * 5,
    );
    prefetch(
      ["jobs", jobId, "assessments"],
      `/jobs/${jobId}/assessments`,
      1000 * 60 * 5,
    );
  }, [jobId, queryClient]);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notesPanelWidth, setNotesPanelWidth] = useState(350);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);
  const [activeJobTab, setActiveJobTab] = useState("overview");

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
  const [newMemberId, setNewMemberId] = useState("");

  const handleAddTeamMember = () => {
    if (!newMemberId) return;
    addTeamMemberMutation.mutate(
      { userId: Number(newMemberId) },
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
    sendMessage(noteText.trim());
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

  // Seed the editable copy whenever the query returns a new list.
  const [seededQuestions, setSeededQuestions] = useState<
    CustomQuestion[] | null
  >(null);
  if (customQuestionsData?.data && customQuestionsData.data !== seededQuestions) {
    setSeededQuestions(customQuestionsData.data);
    setQuestions(customQuestionsData.data);
  }

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLgUp(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isResizingNotes) return;
    const MIN = 360,
      MAX = 700;
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

  const [stages, setStages] = useState<(PipelineStage & { color: string })[]>(
    [],
  );
  const [seededStages, setSeededStages] = useState<PipelineStage[] | null>(
    null,
  );
  if (pipelineData?.data && pipelineData.data !== seededStages) {
    setSeededStages(pipelineData.data);
    setStages(
      [...pipelineData.data]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((s) => ({
          ...s,
          color: STAGE_COLORS[s.stageType] ?? "bg-slate-400",
        })),
    );
  }

  const [addStageOpen, setAddStageOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageType, setNewStageType] = useState("screening");
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [detachTarget, setDetachTarget] = useState<number | null>(null);
  const [stageDeleteTarget, setStageDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [assessmentSelectId, setAssessmentSelectId] = useState("");
  const [triggerStageSelectId, setTriggerStageSelectId] = useState("");

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
        stageType: newStageType,
      },
      {
        onSuccess: () => {
          setNewStageName("");
          setNewStageType("screening");
          setAddStageOpen(false);
        },
      },
    );
  };

  const stageReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleStageReorder = (from: number, to: number) => {
    const reordered = [...stages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setStages(reordered);

    if (stageReorderTimeoutRef.current)
      clearTimeout(stageReorderTimeoutRef.current);
    stageReorderTimeoutRef.current = setTimeout(() => {
      reorderStagesMutation.mutate(
        reordered.map((s, idx) => ({ id: s.id, position: idx + 1 })),
      );
    }, 500);
  };

  const questionReorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleQuestionReorder = (from: number, to: number) => {
    const reordered = [...questions];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setQuestions(reordered);

    if (questionReorderTimeoutRef.current)
      clearTimeout(questionReorderTimeoutRef.current);
    questionReorderTimeoutRef.current = setTimeout(() => {
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

  const salaryStr = job ? formatSalary(job) : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <JobHeader
        job={job}
        jobLoading={jobLoading}
        jobCandidateCount={jobCandidateCount}
        jobCandidatesPending={jobCandidatesPending}
        salaryStr={salaryStr}
        isNotesOpen={isNotesOpen}
        setIsNotesOpen={setIsNotesOpen}
        jobId={jobId}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-5 sm:px-6">
          <main className="min-w-0">
            <Tabs
              value={activeJobTab}
              onValueChange={setActiveJobTab}
              className="w-full"
            >
              <div className="mb-5">
                <div className="flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-lg border border-slate-300 bg-white p-1.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  {JOB_TABS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setActiveJobTab(value)}
                      className={`inline-flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-md border px-4 text-[14px] font-semibold leading-none transition-colors ${
                        activeJobTab === value
                          ? "border-none bg-[var(--theme-color)] text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                          : "border-none bg-neutral-100 text-slate-700 hover:bg-neutral-200 hover:text-slate-950 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <JobTabs
                activeJobTab={activeJobTab}
                job={job}
                jobLoading={jobLoading}
                team={team}
                allUsers={allUsers}
                addTeamMemberOpen={addTeamMemberOpen}
                setAddTeamMemberOpen={setAddTeamMemberOpen}
                newMemberId={newMemberId}
                setNewMemberId={setNewMemberId}
                handleAddTeamMember={handleAddTeamMember}
                addTeamMemberMutationPending={addTeamMemberMutation.isPending}
                removeTeamMemberMutation={removeTeamMemberMutation}
                stages={stages}
                setAddStageOpen={setAddStageOpen}
                editingStageId={editingStageId}
                setEditingStageId={setEditingStageId}
                editingStageName={editingStageName}
                setEditingStageName={setEditingStageName}
                handleSaveStage={handleSaveStage}
                updateStageMutationPending={updateStageMutation.isPending}
                setStageDeleteTarget={setStageDeleteTarget}
                handleStageReorder={handleStageReorder}
                questions={questions}
                setIsAddingMode={setIsAddingMode}
                isAddingMode={isAddingMode}
                editingQuestionId={editingQuestionId}
                setEditingQuestionId={setEditingQuestionId}
                editQuestionType={editQuestionType}
                setEditQuestionType={setEditQuestionType}
                editQuestionText={editQuestionText}
                setEditQuestionText={setEditQuestionText}
                editQuestionRequired={editQuestionRequired}
                setEditQuestionRequired={setEditQuestionRequired}
                handleSaveQuestion={handleSaveQuestion}
                updateQuestionMutationPending={updateQuestionMutation.isPending}
                openEditQuestion={openEditQuestion}
                deleteQuestionMutation={deleteQuestionMutation}
                handleQuestionReorder={handleQuestionReorder}
                newQuestionType={newQuestionType}
                setNewQuestionType={setNewQuestionType}
                newQuestionText={newQuestionText}
                setNewQuestionText={setNewQuestionText}
                newQuestionRequired={newQuestionRequired}
                setNewQuestionRequired={setNewQuestionRequired}
                createQuestionMutation={createQuestionMutation}
                isAssessmentDialogOpen={isAssessmentDialogOpen}
                setIsAssessmentDialogOpen={setIsAssessmentDialogOpen}
                attachedAssessments={attachedAssessments}
                allAssessments={allAssessments}
                setDetachTarget={setDetachTarget}
                attachAssessmentMutation={attachAssessmentMutation}
                assessmentSelectId={assessmentSelectId}
                setAssessmentSelectId={setAssessmentSelectId}
                triggerStageSelectId={triggerStageSelectId}
                setTriggerStageSelectId={setTriggerStageSelectId}
              />
            </Tabs>

            <AddStageDialog
              open={addStageOpen}
              onOpenChange={setAddStageOpen}
              newStageType={newStageType}
              setNewStageType={setNewStageType}
              newStageName={newStageName}
              setNewStageName={setNewStageName}
              handleAddStage={handleAddStage}
              isPending={createStageMutation.isPending}
            />
          </main>
        </div>
      </div>

      {isNotesOpen && (
        <DiscussionsPanel
          isLgUp={isLgUp}
          notesPanelWidth={notesPanelWidth}
          setIsResizingNotes={setIsResizingNotes}
          allMessages={allMessages}
          setIsNotesOpen={setIsNotesOpen}
          me={me}
          timeAgo={timeAgo}
          editingNoteId={editingNoteId}
          setEditingNoteId={setEditingNoteId}
          editingNoteText={editingNoteText}
          setEditingNoteText={setEditingNoteText}
          editMessage={editMessage}
          setNoteDeleteTarget={setNoteDeleteTarget}
          noteText={noteText}
          setNoteText={setNoteText}
          handleSendNote={handleSendNote}
        />
      )}

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
            <AlertDialogCancel variant="ghost" className="h-10 rounded-md border border-slate-200 !bg-white px-6 text-[14px] font-medium !text-slate-700 shadow-none hover:!bg-slate-50 dark:border-neutral-800 dark:!bg-neutral-900 dark:!text-neutral-200 dark:hover:!bg-neutral-800 cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!stageDeleteTarget) return;
                deleteStageMutation.mutate(stageDeleteTarget.id, {
                  onSuccess: () => setStageDeleteTarget(null),
                });
              }}
              disabled={deleteStageMutation.isPending || !stageDeleteTarget}
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
              {detachAssessmentMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                deleteMessage(noteDeleteTarget.id);
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
    </div>
  );
}
