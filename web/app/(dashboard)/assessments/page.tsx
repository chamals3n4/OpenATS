"use client";

import { useState } from "react";
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
} from "@/hooks/use-api";
import type { Assessment } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeButton } from "@/components/theme-button";
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

export default function AssessmentsPage() {
  const { data, isLoading } = useAssessments();
  const deleteAssessment = useDeleteAssessment();
  const assessments = data?.data ?? [];

  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);

  // Invite dialog state
  const [inviteTarget, setInviteTarget] = useState<Assessment | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: candidatesData } = useCandidates();
  const candidates = candidatesData?.data ?? [];
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
      { candidateId: Number(selectedCandidateId), assessmentId: inviteTarget.id },
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
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            placeholder="Search assessments…"
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600 transition-[border-color] duration-200 ease-in-out"
          />
        </div>
        <Select>
          <SelectTrigger className="w-36 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-36 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-500 dark:text-neutral-400 text-sm focus:ring-0 px-4">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          className="text-slate-600 dark:text-neutral-400 font-medium text-sm h-10 px-4 hover:bg-transparent hover:text-slate-900 dark:hover:text-neutral-100 border-none ml-2"
        >
          Clear All
        </Button>
      </div>

      <div className="px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm gap-2">
            <Loader2 className="size-4 animate-spin text-slate-400" />
            Loading assessments...
          </div>
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

      {/* Invite dialog */}
      <Dialog open={!!inviteTarget} onOpenChange={(o) => !o && setInviteTarget(null)}>
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
              <p className="text-[14px] font-medium text-slate-700 dark:text-neutral-300">{inviteTarget?.title}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                Select Candidate
              </Label>
              <Select value={selectedCandidateId} onValueChange={(v) => setSelectedCandidateId(v ?? "")}>
                <SelectTrigger className="h-10 border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-none text-[13px] focus:ring-0 w-full">
                  <SelectValue placeholder="Choose a candidate…" />
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-[13px]">
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
                  <><Loader2 className="size-3.5 animate-spin" />Generating…</>
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
                    <HugeiconsIcon icon={copied ? CheckmarkCircle01Icon : Copy01Icon} className="size-3.5" />
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
                {(inviteMutation.error as Error).message ?? "Failed to generate invite."}
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
              <strong className="text-slate-700 dark:text-neutral-200">{deleteTarget?.title}</strong>{" "}
              will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-9 px-5 rounded-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800 text-[13px] font-medium shadow-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteAssessment.isPending}
              className="h-9 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium shadow-none border-none disabled:opacity-70"
            >
              {deleteAssessment.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              {deleteAssessment.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
