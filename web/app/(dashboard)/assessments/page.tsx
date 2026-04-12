"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search01Icon,
  PlusSignIcon,
  Delete02Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  Time01Icon,
  QuestionIcon,
  UserAdd01Icon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAssessments,
  useDeleteAssessment,
  useCandidates,
  useInviteToAssessment,
  useCandidateAssessments,
  useCandidate,
} from "@/hooks/use-api";
import type { Assessment, Candidate } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeButton } from "@/components/theme-button";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
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
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function parseRagMeta(
  description: string | null | undefined,
): { candidateId: number; stageId: number } | null {
  if (!description) return null;
  const m = description.match(/__rag_candidate_(\d+)_stage_(\d+)__/);
  if (!m) return null;
  return { candidateId: Number(m[1]), stageId: Number(m[2]) };
}

function parseRagCandidateId(description: string | null | undefined): number | null {
  return parseRagMeta(description)?.candidateId ?? null;
}

function IndividualAssessmentCard({
  a,
  onDelete,
  getCandidateName,
}: {
  a: Assessment;
  onDelete: (a: Assessment) => void;
  getCandidateName: (a: Assessment) => string;
}) {
  const candidateId = parseRagCandidateId(a.description);
  const { data: attemptsData } = useCandidateAssessments(candidateId ?? 0);
  const attempts = attemptsData?.data ?? [];
  const completedAttempt = candidateId
    ? attempts.find(
        (att) => att.assessmentId === a.id && att.status === "completed",
      )
    : undefined;
  const showAnswers = Boolean(candidateId && completedAttempt);

  return (
    <div className="flex flex-col border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex flex-col gap-2.5 px-5 pt-5 pb-4">
        <p className="text-[12px] text-slate-400 dark:text-neutral-500 font-medium">
          Candidate:{" "}
          <span className="text-slate-600 dark:text-neutral-300">
            {getCandidateName(a)}
          </span>
        </p>
        {showAnswers ? (
          <p className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200 leading-snug truncate">
            {a.title}
          </p>
        ) : (
          <Link
            href={`/assessments/${a.id}`}
            className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200 leading-snug hover:underline underline-offset-4 decoration-1 truncate"
          >
            {a.title}
          </Link>
        )}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400">
            Individual
          </span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1 text-[12px] text-slate-400">
              <HugeiconsIcon icon={QuestionIcon} className="size-3.5" />
              {a.questions?.length || 0}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-slate-400">
              <HugeiconsIcon icon={Time01Icon} className="size-3.5" />
              {a.timeLimit}m
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 border-t border-slate-100 dark:border-neutral-800">
        {showAnswers && candidateId && completedAttempt ? (
          <ThemeButton
            asChild
            href={`/candidates/${candidateId}/assessments/${completedAttempt.id}`}
            className="w-full h-8 px-5 text-[12px] font-medium shadow-none border-none rounded-md justify-center"
          >
            Show Candidate Answers
          </ThemeButton>
        ) : (
          <>
            <ThemeButton
              asChild
              href={`/assessments/${a.id}`}
              className="h-8 px-5 text-[12px] font-medium shadow-none border-none rounded-md"
            >
              Edit
            </ThemeButton>
            <button
              type="button"
              onClick={() => onDelete(a)}
              className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-red-200 dark:border-red-900/50 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PendingIndividualAssessmentCard({ candidate }: { candidate: Candidate }) {
  const { data, isLoading } = useCandidate(candidate.id, { enabled: !!candidate.id });
  const cvStatus = data?.data?.cvAnalysis?.status;
  const isPending = cvStatus === "pending";
  const isPreparing = cvStatus === "done";

  return (
    <div className="flex flex-col border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm">
      <div className="flex flex-col gap-2.5 px-5 pt-5 pb-4">
        <p className="text-[12px] text-slate-400 dark:text-neutral-500 font-medium">
          Candidate:{" "}
          <span className="text-slate-600 dark:text-neutral-300">
            {candidate.firstName} {candidate.lastName}
          </span>
        </p>
        <p className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200 leading-snug truncate">
          Individual Assessment - Preparing...
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400">
            Individual
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-neutral-800">
        <Loader2 className={`size-4 text-[var(--theme-color)] ${isPending || isPreparing ? "animate-spin" : ""}`} />
        <p className="text-[12px] text-slate-500 dark:text-neutral-400">
          {isPending
            ? "AI is analyzing CV..."
            : isPreparing
              ? "AI is preparing questions based on the CV..."
              : "AI is preparing questions based on the CV..."}
        </p>
      </div>
    </div>
  );
}

export default function AssessmentsPage() {
  const { data, isLoading, refetch } = useAssessments();
  const deleteAssessment = useDeleteAssessment();
  const assessments = data?.data ?? [];
  const [assessmentTab, setAssessmentTab] = useState("custom");
  const isRagGeneratedAssessment = (a: Assessment) =>
    (a.description ?? "").startsWith("__rag_candidate_");
  const customAssessments = assessments.filter((a) => !isRagGeneratedAssessment(a));
  const individualAssessments = assessments.filter((a) => isRagGeneratedAssessment(a));

  const getCandidateName = (a: Assessment) => {
    const prefix = "Individual Assessment - ";
    if (a.title?.startsWith(prefix)) {
      const full = a.title.slice(prefix.length).trim();
      const cleaned = full.replace(/\s*\(.*\)\s*$/, "").trim();
      return cleaned || "Candidate";
    }
    return "Candidate";
  };

  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);

  // Invite dialog state
  const [inviteTarget, setInviteTarget] = useState<Assessment | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: candidatesData } = useCandidates();
  const candidates = candidatesData?.data ?? [];
  const existingCandidateStagePairs = new Set(
    individualAssessments
      .map((a) => parseRagMeta(a.description))
      .filter((meta): meta is { candidateId: number; stageId: number } => !!meta)
      .map((meta) => `${meta.candidateId}:${meta.stageId}`),
  );
  const pendingCandidates = candidates.filter(
    (c) =>
      !!c.resumeUrl &&
      !!c.currentStageId &&
      !existingCandidateStagePairs.has(`${c.id}:${c.currentStageId}`),
  );

  // While AI is preparing questions, keep the page updated so the loading box
  // disappears and the generated assessment card shows Edit/Delete immediately.
  useEffect(() => {
    if (assessmentTab !== "individual") return;
    if (pendingCandidates.length === 0) return;
    const t = setInterval(() => {
      void refetch();
    }, 2500);
    return () => clearInterval(t);
  }, [assessmentTab, pendingCandidates.length, refetch]);
  const inviteMutation = useInviteToAssessment();

  const openInviteDialog = (a: Assessment) => {
    setInviteTarget(a);
    setSelectedCandidateId("");
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleGenerateLink = () => {
    if (!inviteTarget || !selectedCandidateId) return;
    inviteMutation.mutate(
      {
        candidateId: Number(selectedCandidateId),
        assessmentId: inviteTarget.id,
      },
      {
        onSuccess: (res) => {
          const url = `${window.location.origin}/assessment/${res.data.token}`;
          setGeneratedLink(url);
          if (res.didSendInvite === false) {
            toast.message("Existing invite", {
              description:
                "This candidate already had an active assessment link — showing it below (no new email).",
            });
          }
        },
      },
    );
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteAssessment.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (error: any) => {
        alert(error.message || "Failed to delete assessment");
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Assessments
        </h1>
        <ThemeButton
          asChild
          href="/assessments/new"
          prefetch
          className="h-10 px-4 gap-2 text-sm shadow-none border-none"
        >
          <HugeiconsIcon
            icon={PlusSignIcon}
            className="size-4"
            strokeWidth={2.5}
          />
          <span>New Assessment</span>
        </ThemeButton>
      </div>

      <div className="border-y border-slate-200 dark:border-neutral-800 px-8 py-3.5 flex items-center gap-4">
        <div className="relative w-90">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
          />
          <Input
            placeholder="Search assessments…"
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
      </div>

<<<<<<< HEAD
      <div className="px-8 pt-4">
        <Tabs value={assessmentTab} onValueChange={setAssessmentTab} className="gap-4">
          <TabsList className="h-10 bg-transparent p-0 gap-3">
            <TabsTrigger
              value="custom"
              className="px-6 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 data-active:border-[var(--theme-color)] data-active:text-[var(--theme-color)]"
            >
              Custom Assesment
            </TabsTrigger>
            <TabsTrigger
              value="individual"
              className="px-6 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 data-active:border-[var(--theme-color)] data-active:text-[var(--theme-color)]"
            >
              Individual Assesment
            </TabsTrigger>
          </TabsList>
=======
      <div className="px-8 py-6">
        {isLoading ? (
          <ListSectionSpinner />
        ) : assessments.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            No assessments found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="flex flex-col border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm"
              >
                {/* Card body */}
                <div className="flex flex-col gap-2.5 px-5 pt-5 pb-4">
                  {/* Title */}
                  <Link
                    href={`/assessments/${a.id}`}
                    className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200 leading-snug hover:underline underline-offset-4 decoration-1 truncate"
                  >
                    {a.title}
                  </Link>
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf

          <TabsContent value="custom">
            <div className="py-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm gap-2">
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                  Loading assessments...
                </div>
              ) : customAssessments.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  No assessments found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-3">
                  {customAssessments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm"
                    >
                      {/* Card body */}
                      <div className="flex flex-col gap-2.5 px-5 pt-5 pb-4">
                        {/* Title */}
                        <Link
                          href={`/assessments/${a.id}`}
                          className="text-[15px] font-semibold text-slate-800 dark:text-neutral-200 leading-snug hover:underline underline-offset-4 decoration-1 truncate"
                        >
                          {a.title}
                        </Link>

                        {/* Badges + stats in one row */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400`}
                          >
                            Active
                          </span>
                          <span className="ml-auto flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[12px] text-slate-400">
                              <HugeiconsIcon
                                icon={QuestionIcon}
                                className="size-3.5"
                              />
                              {a.questions?.length || 0}
                            </span>
                            <span className="flex items-center gap-1 text-[12px] text-slate-400">
                              <HugeiconsIcon icon={Time01Icon} className="size-3.5" />
                              {a.timeLimit}m
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center gap-1.5 px-4 py-3 border-t border-slate-100 dark:border-neutral-800">
                        <ThemeButton
                          asChild
                          href={`/assessments/${a.id}`}
                          className="h-8 px-5 text-[12px] font-medium shadow-none border-none rounded-md"
                        >
                          <Link href={`/assessments/${a.id}`}>Edit</Link>
                        </ThemeButton>
                        <button
                          onClick={() => openInviteDialog(a)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:text-slate-700 dark:hover:text-neutral-200"
                        >
                          <HugeiconsIcon icon={UserAdd01Icon} className="size-3.5" />
                          Invite
                        </button>
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium border border-red-200 dark:border-red-900/50 text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="individual">
            <div className="py-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm gap-2">
                  <Loader2 className="size-4 animate-spin text-slate-400" />
                  Loading assessments...
                </div>
              ) : individualAssessments.length === 0 && pendingCandidates.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  No individual assessments found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-3">
                  {individualAssessments.map((a) => (
                    <IndividualAssessmentCard
                      key={a.id}
                      a={a}
                      onDelete={(x) => setDeleteTarget(x)}
                      getCandidateName={getCandidateName}
                    />
                  ))}
                  {pendingCandidates.map((candidate) => (
                    <PendingIndividualAssessmentCard
                      key={`pending-${candidate.id}`}
                      candidate={candidate}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite dialog */}
      <Dialog
        open={!!inviteTarget}
        onOpenChange={(o) => !o && setInviteTarget(null)}
      >
        <DialogContent className="max-w-md rounded-xl border-slate-200 dark:border-neutral-800 shadow-lg p-6 bg-white dark:bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Invite Candidate
            </DialogTitle>
            <p className="text-[13px] text-slate-500 dark:text-neutral-400 mt-1">
              Generates a unique assessment link for the selected candidate.
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                Assessment
              </Label>
              <p className="text-[14px] font-medium text-slate-700 dark:text-neutral-300">
                {inviteTarget?.title}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                Select Candidate
              </Label>
              <Select
                value={selectedCandidateId}
                onValueChange={(v) => setSelectedCandidateId(v ?? "")}
              >
                <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                  <SelectValue placeholder="Choose a candidate…" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  {candidates.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={String(c.id)}
                      className="text-[13px]"
                    >
                      {c.firstName} {c.lastName}
                      {c.jobTitle ? ` — ${c.jobTitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!generatedLink ? (
              <Button
                onClick={handleGenerateLink}
                disabled={!selectedCandidateId || inviteMutation.isPending}
                className="w-full h-10 bg-[var(--theme-color)] hover:bg-[var(--theme-color-hover)] text-white shadow-none border-none rounded-lg text-[13px] font-medium gap-2"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  "Generate Link"
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                  Assessment Link
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-[12px] text-slate-600 dark:text-neutral-300 truncate font-mono">
                    {generatedLink}
                  </div>
                  <button
                    onClick={copyLink}
                    className={`shrink-0 h-9 px-3 rounded-lg text-[12px] font-medium border inline-flex items-center gap-1.5 ${
                      copied
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                        : "border-slate-200 dark:border-neutral-800 text-slate-500 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                      className="size-3.5"
                    />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <a
                  href={generatedLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--theme-color)] font-medium hover:underline"
                >
                  <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" />
                  Open in new tab
                </a>
              </div>
            )}

            {inviteMutation.isError && (
              <p className="text-red-500 text-[12px]">
                {(inviteMutation.error as Error).message ??
                  "Failed to generate invite."}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-xl border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] font-semibold text-slate-900 dark:text-neutral-100">
              Delete Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-neutral-200">
                {deleteTarget?.title}
              </strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 cursor-pointer rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 text-[13px] font-medium shadow-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteAssessment.isPending}
              className="h-9 px-5 rounded-lg cursor-pointer bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium shadow-none border-none disabled:opacity-70"
            >
              {deleteAssessment.isPending && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
              {deleteAssessment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
