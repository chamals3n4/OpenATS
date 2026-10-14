"use client";

import { toast } from "sonner";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { serverFetch } from "@/lib/server-fetch";
import { Tabs } from "@/components/ui/tabs";

import { JobHeader } from "./_components/job-header";
import { JobTabs } from "./_components/job-tabs";
import { JobSetupAlert } from "./_components/job-setup-alert";
import { DiscussionsPanel } from "./_components/discussions-panel";
import { StageDialog, type StageValues } from "./_components/dialogs/stage-dialog";

import { moveItem, positionChanges } from "./_lib/question-utils";
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
  { value: "scoring", label: "Scoring" },
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
  const router = useRouter();
  // New jobs come with ?setup=1 to show the setup alert
  const showSetupAlert = useSearchParams().get("setup") === "1";
  const dismissSetupAlert = () => router.replace(`/jobs/${jobId}`, { scroll: false });

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
  const [notesPanelWidth, setNotesPanelWidth] = useState(380);
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const [activeJobTab, setActiveJobTab] = useState("overview");

  const { data: jobData, isLoading: jobLoading } = useJob(jobId);
  const { data: pipelineData } = usePipeline(jobId);
  const { data: jobCandidatesData, isPending: jobCandidatesPending } =
    useCandidates(jobId, undefined, {
      enabled: Number.isFinite(jobId) && jobId > 0,
    });
  const jobCandidateCount = jobCandidatesData?.data?.length ?? 0;
  const { data: meData } = useCurrentUser();
  const { data: chatHistoryData, isError: chatHistoryError } = useChatHistory(jobId, isNotesOpen);
  const { sendMessage, editMessage, deleteMessage, denied: chatDenied } = useJobChat(
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
          toast.success("Added to the hiring team");
        },
        onError: (error) => toast.error(error.message || "Failed to add the member"),
      },
    );
  };

  const allAssessments = allAssessmentsData?.data ?? [];
  const attachedAssessments = jobAssessmentsData?.data ?? [];
  const job = jobData?.data;
  const me = meData?.data;

  // useJobChat writes live messages into this cache
  const allMessages = useMemo(
    () =>
      [...(chatHistoryData?.data ?? [])].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      ),
    [chatHistoryData?.data],
  );

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

  // Reset the local copy when the query changes
  const [seededQuestions, setSeededQuestions] = useState<
    CustomQuestion[] | null
  >(null);
  if (customQuestionsData?.data && customQuestionsData.data !== seededQuestions) {
    setSeededQuestions(customQuestionsData.data);
    setQuestions(customQuestionsData.data);
  }

  useEffect(() => {
    if (!isResizingNotes) return;
    // The job beside it keeps at least half of the window.
    const MIN = 340,
      MAX = Math.min(720, Math.round(window.innerWidth / 2));
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

  // Stage dialog: closed, add or edit
  const [stageDialog, setStageDialog] = useState<{ stage: PipelineStage | null } | null>(null);
  const [stageDeleteTarget, setStageDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleSubmitStage = (values: StageValues) => {
    const editing = stageDialog?.stage;
    if (editing) {
      updateStageMutation.mutate(
        { stageId: editing.id, data: values },
        {
          onSuccess: () => {
            setStageDialog(null);
            toast.success("Stage saved");
          },
          onError: (error) => toast.error(error.message || "Failed to save the stage"),
        },
      );
      return;
    }
    const nextPosition =
      stages.length === 0
        ? 1
        : Math.max(...stages.map((s) => s.position ?? 0)) + 1;
    createStageMutation.mutate(
      { ...values, position: nextPosition },
      {
        onSuccess: () => {
          setStageDialog(null);
          toast.success("Stage added");
        },
        onError: (error) => toast.error(error.message || "Failed to add the stage"),
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
    const reordered = moveItem(questions, from, to);
    setQuestions(reordered);

    if (questionReorderTimeoutRef.current)
      clearTimeout(questionReorderTimeoutRef.current);
    questionReorderTimeoutRef.current = setTimeout(() => {
      positionChanges(reordered).forEach(({ id, position }) => {
        updateQuestionMutation.mutate({ questionId: id, data: { position } });
      });
    }, 500);
  };

  const salaryStr = job ? formatSalary(job) : null;

  return (
    // Job and discussion side by side, each scrolls
    <div className="flex h-[calc(100dvh-var(--header-height))] w-full min-w-0 overflow-hidden bg-slate-50 dark:bg-neutral-950">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
              <div className="mb-4">
                <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-300 bg-transparent p-1 shadow-none dark:border-neutral-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {JOB_TABS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setActiveJobTab(value)}
                      className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-medium leading-none transition-colors ${
                        activeJobTab === value
                          ? "border-none bg-[var(--theme-color)] text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                          : "border-none bg-slate-200/70 text-slate-800 hover:bg-slate-200 hover:text-slate-950 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {showSetupAlert && (
                <JobSetupAlert
                  onAddQuestions={() => {
                    setActiveJobTab("custom-questions");
                    dismissSetupAlert();
                  }}
                  onSetUpScoring={() => {
                    setActiveJobTab("scoring");
                    dismissSetupAlert();
                  }}
                  onDismiss={dismissSetupAlert}
                />
              )}

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
                onAddStage={() => setStageDialog({ stage: null })}
                onEditStage={(stage) => setStageDialog({ stage })}
                setStageDeleteTarget={setStageDeleteTarget}
                handleStageReorder={handleStageReorder}
                questions={questions}
                deleteQuestionMutation={deleteQuestionMutation}
                updateQuestionMutation={updateQuestionMutation}
                handleQuestionReorder={handleQuestionReorder}
                createQuestionMutation={createQuestionMutation}
                attachedAssessments={attachedAssessments}
                allAssessments={allAssessments}
                attachAssessmentMutation={attachAssessmentMutation}
                detachAssessmentMutation={detachAssessmentMutation}
              />
            </Tabs>

            <StageDialog
              open={stageDialog !== null}
              stage={stageDialog?.stage ?? null}
              isPending={createStageMutation.isPending || updateStageMutation.isPending}
              onSubmit={handleSubmitStage}
              onClose={() => setStageDialog(null)}
            />
          </main>
        </div>
      </div>

      </div>

      {isNotesOpen && (
        <DiscussionsPanel
          notesPanelWidth={notesPanelWidth}
          setIsResizingNotes={setIsResizingNotes}
          allMessages={allMessages}
          historyError={chatHistoryError || chatDenied}
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

      <ConfirmDeleteDialog
        open={stageDeleteTarget !== null}
        title="Delete this stage?"
        description={
          <>
            <ConfirmDeleteName>
              {stageDeleteTarget?.name ?? "This stage"}
            </ConfirmDeleteName>{" "}
            will be permanently deleted. This cannot be undone.
          </>
        }
        isPending={deleteStageMutation.isPending}
        onClose={() => setStageDeleteTarget(null)}
        onConfirm={() => {
          if (!stageDeleteTarget) return;
          deleteStageMutation.mutate(stageDeleteTarget.id, {
            onSuccess: () => setStageDeleteTarget(null),
          });
        }}
      />

      <ConfirmDeleteDialog
        open={noteDeleteTarget !== null}
        title="Delete this note?"
        description="This note will be permanently deleted. This cannot be undone."
        onClose={() => setNoteDeleteTarget(null)}
        onConfirm={() => {
          if (!me || !noteDeleteTarget) return;
          deleteMessage(noteDeleteTarget.id);
          setNoteDeleteTarget(null);
        }}
      />
    </div>
  );
}
