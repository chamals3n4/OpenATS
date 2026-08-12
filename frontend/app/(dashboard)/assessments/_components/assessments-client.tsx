"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  useAssessments,
  useDeleteAssessment,
  useInviteToAssessment,
} from "@/hooks/queries/use-assessments";
import { useCandidates } from "@/hooks/queries/use-candidates";
import type { Assessment } from "@/types";

import { AssessmentHeader } from "./assessment-header";
import { AssessmentCardGrid } from "./card-grid";
import { AssessmentInviteDialog } from "./invite-dialog";
import { AssessmentDeleteDialog } from "./delete-dialog";
import { generateAssessmentUrl } from "../lib/utils";

export default function AssessmentsPageClient() {
  const { data, isLoading } = useAssessments();
  const assessments = data?.data ?? [];

  const { data: candidatesData } = useCandidates();
  const candidates = candidatesData?.data ?? [];

  const deleteAssessment = useDeleteAssessment();
  const inviteMutation = useInviteToAssessment();

  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteAssessment.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (error) => {
        toast.error(error.message || "Failed to delete assessment");
        setDeleteTarget(null);
      },
    });
  }, [deleteTarget, deleteAssessment]);

  const [inviteTarget, setInviteTarget] = useState<Assessment | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openInviteDialog = useCallback((assessment: Assessment) => {
    setInviteTarget(assessment);
    setSelectedCandidateId("");
    setGeneratedLink(null);
    setCopied(false);
  }, []);

  const handleGenerateLink = useCallback(() => {
    if (!inviteTarget || !selectedCandidateId) return;

    inviteMutation.mutate(
      {
        candidateId: Number(selectedCandidateId),
        assessmentId: inviteTarget.id,
      },
      {
        onSuccess: (res) => {
          const url = generateAssessmentUrl(res.data.token);
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
  }, [inviteTarget, selectedCandidateId, inviteMutation]);

  const handleCopyLink = useCallback(() => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedLink]);

  const handleCloseInvite = useCallback(() => {
    setInviteTarget(null);
    setGeneratedLink(null);
    setCopied(false);
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <AssessmentHeader />

      <AssessmentCardGrid
        assessments={assessments}
        isLoading={isLoading}
        onDelete={setDeleteTarget}
        onInvite={openInviteDialog}
      />

      <AssessmentInviteDialog
        assessment={inviteTarget}
        candidates={candidates}
        selectedCandidateId={selectedCandidateId}
        onCandidateChange={setSelectedCandidateId}
        generatedLink={generatedLink}
        copied={copied}
        isPending={inviteMutation.isPending}
        isError={inviteMutation.isError}
        error={inviteMutation.error as Error | null}
        onGenerateLink={handleGenerateLink}
        onCopyLink={handleCopyLink}
        onClose={handleCloseInvite}
      />

      <AssessmentDeleteDialog
        assessment={deleteTarget}
        isOpen={!!deleteTarget}
        isPending={deleteAssessment.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
