"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ConfirmDeleteDialog,
  ConfirmDeleteName,
} from "@/components/ui/confirm-delete-dialog";
import {
  useCreateOffer,
  useMarkOfferAsHired,
  useSendOffer,
  useUpdateOffer,
} from "@/hooks/queries/use-offers";
import {
  OFFER_FIELD_LABELS,
  formValuesToPayload,
  getMissingFields,
  offerToFormValues,
  type OfferFormValues,
} from "../../lib/offer-utils";
import { OfferDetails } from "../offer/offer-details";
import { OfferEditForm } from "../offer/offer-edit-form";
import { OfferEmptyState } from "../offer/offer-empty-state";
import type { CandidateDetail, Offer, PipelineStage, Template } from "@/types";

interface OfferSectionProps {
  candidate: CandidateDetail;
  candidateId: number;
  offer: Offer | null;
  pipelineStages: PipelineStage[];
  emailTemplates: Template[];
  jobId: number;
}

interface PendingSend {
  values: OfferFormValues;
  /** True when sending the saved offer as it is, so there is nothing to save first. */
  skipUpdate: boolean;
}

export function OfferSection({
  candidate,
  candidateId,
  offer,
  pipelineStages,
  emailTemplates,
  jobId,
}: OfferSectionProps) {
  const queryClient = useQueryClient();
  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();
  const sendOffer = useSendOffer();
  const markHired = useMarkOfferAsHired();

  const [isEditing, setIsEditing] = useState(false);
  const [showErrorsOnOpen, setShowErrorsOnOpen] = useState(false);
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);
  const [confirmHire, setConfirmHire] = useState(false);

  const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const currentStage = pipelineStages.find((s) => s.id === candidate.currentStageId);
  const canCreate = currentStage?.stageType === "offer";

  const refreshCandidate = () =>
    queryClient.invalidateQueries({ queryKey: ["candidates", candidateId] });

  const handleCreate = () =>
    createOffer.mutate(
      { candidateId, jobId },
      {
        onSuccess: () => {
          refreshCandidate();
          toast.success("Offer draft created");
        },
        onError: () => toast.error("Failed to create the offer"),
      },
    );

  const handleSave = (values: OfferFormValues) => {
    if (!offer) return;
    updateOffer.mutate(
      { offerId: offer.id, data: formValuesToPayload(values) },
      {
        onSuccess: () => {
          toast.success("Offer saved");
          setIsEditing(false);
        },
        onError: (error) => toast.error(error.message || "Failed to save the offer"),
      },
    );
  };

  // Sending from the summary uses the saved offer, so check that is complete first.
  const handleSendFromSummary = () => {
    if (!offer) return;
    const values = offerToFormValues(offer);
    const missing = getMissingFields(values);
    if (missing.length > 0) {
      toast.error(
        `Add ${missing.map((k) => OFFER_FIELD_LABELS[k].toLowerCase()).join(", ")} before sending.`,
      );
      setShowErrorsOnOpen(true);
      setIsEditing(true);
      return;
    }
    setPendingSend({ values, skipUpdate: true });
  };

  const handleConfirmSend = () => {
    if (!offer || !pendingSend) return;

    const send = () =>
      sendOffer.mutate(offer.id, {
        onSuccess: () => {
          toast.success("Offer sent to the candidate");
          setPendingSend(null);
          setIsEditing(false);
        },
        onError: (error) => toast.error(error.message || "Failed to send the offer"),
      });

    if (pendingSend.skipUpdate) {
      send();
      return;
    }
    updateOffer.mutate(
      { offerId: offer.id, data: formValuesToPayload(pendingSend.values) },
      {
        onSuccess: send,
        onError: (error) => {
          toast.error(error.message || "Failed to update the offer");
          setPendingSend(null);
        },
      },
    );
  };

  const handleConfirmHire = () => {
    if (!offer) return;
    markHired.mutate(offer.id, {
      onSuccess: () => {
        toast.success("Candidate marked as hired");
        setConfirmHire(false);
      },
      onError: (error) => toast.error(error.message || "Failed to mark as hired"),
    });
  };

  const isSendPending = updateOffer.isPending || sendOffer.isPending;

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          Offer Details
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Compensation package and offer letter
        </p>
      </div>

      {!offer ? (
        <OfferEmptyState
          candidateName={candidate.firstName}
          canCreate={canCreate}
          isCreating={createOffer.isPending}
          onCreate={handleCreate}
        />
      ) : isEditing ? (
        <OfferEditForm
          key={offer.id}
          offer={offer}
          candidateId={candidateId}
          candidateName={candidateName}
          initialValues={offerToFormValues(offer)}
          emailTemplates={emailTemplates}
          showErrorsInitially={showErrorsOnOpen}
          isSaving={updateOffer.isPending}
          isSending={isSendPending && pendingSend !== null}
          onCancel={() => {
            setIsEditing(false);
            setShowErrorsOnOpen(false);
          }}
          onSave={handleSave}
          onSend={(values) => setPendingSend({ values, skipUpdate: false })}
        />
      ) : (
        <OfferDetails
          offer={offer}
          candidateName={candidateName}
          isHired={candidate.status === "hired"}
          isSending={sendOffer.isPending}
          isMarkingHired={markHired.isPending}
          onEdit={() => {
            setShowErrorsOnOpen(false);
            setIsEditing(true);
          }}
          onSend={handleSendFromSummary}
          onMarkHired={() => setConfirmHire(true)}
        />
      )}

      <ConfirmDeleteDialog
        open={pendingSend !== null}
        title="Send this offer?"
        description={
          <>
            <ConfirmDeleteName>{candidateName}</ConfirmDeleteName> will receive
            the offer by email at {candidate.email}. You can&apos;t unsend it.
          </>
        }
        confirmLabel="Send offer"
        pendingLabel="Sending"
        confirmClassName="bg-theme hover:bg-theme-hover"
        isPending={isSendPending}
        onClose={() => setPendingSend(null)}
        onConfirm={handleConfirmSend}
      />

      <ConfirmDeleteDialog
        open={confirmHire}
        title="Mark as hired?"
        description={
          <>
            <ConfirmDeleteName>{candidateName}</ConfirmDeleteName> will be
            marked as hired. Their offer was accepted.
          </>
        }
        confirmLabel="Mark as hired"
        pendingLabel="Marking"
        confirmClassName="bg-emerald-600 hover:bg-emerald-700"
        isPending={markHired.isPending}
        onClose={() => setConfirmHire(false)}
        onConfirm={handleConfirmHire}
      />
    </div>
  );
}
