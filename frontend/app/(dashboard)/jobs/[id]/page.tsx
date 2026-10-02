"use client";

import { ConfirmDeleteDialog, ConfirmDeleteName } from "@/components/ui/confirm-delete-dialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { serverFetch } from "@/lib/auth-action";
import { Tabs } from "@/components/ui/tabs";

import { JobHeader } from "./_components/JobHeader";
import { JobTabs } from "./_components/JobTabs";
import { DiscussionsPanel } from "./_components/DiscussionsPanel";
import { AddStageDialog } from "./_components/dialogs/AddStageDialog";

import { moveItem, positionChanges } from "./lib/question-utils";
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
  const [stageDeleteTarget, setStageDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

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
