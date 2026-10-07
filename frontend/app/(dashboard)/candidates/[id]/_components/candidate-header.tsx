"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CallIcon,
  Mail01Icon,
  Clock01Icon,
  Edit02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/score-badge";
import { RowDeleteButton } from "@/components/table/row-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, OFFER_STATUS_STYLES } from "./constants";
import { useIsManager } from "@/hooks/use-role";
import type { useMoveCandidateStage } from "@/hooks/queries/use-candidates";
import type { CandidateDetail, Offer, PipelineStage } from "@/types";

interface CandidateHeaderProps {
  candidate: CandidateDetail;
  offer: Offer | null;
  pipelineStages: PipelineStage[];
  selectedStageId: string;
  effectiveSelectedStageId: string;
  hasStageChange: boolean;
  moveStageMutation: ReturnType<typeof useMoveCandidateStage>;
  onStageChange: (value: string) => void;
  onCancelStageChange: () => void;
  onSaveStageChange: () => void;
  onViewCv: () => void;
  /** Opens the Scores tab. */
  onViewScores?: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CandidateHeader({
  candidate,
  offer,
  pipelineStages,
  selectedStageId,
  effectiveSelectedStageId,
  hasStageChange,
  moveStageMutation,
  onStageChange,
  onCancelStageChange,
  onSaveStageChange,
  onViewCv,
  onViewScores,
  onClose,
  onEdit,
  onDelete,
}: CandidateHeaderProps) {
  const isManager = useIsManager();
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;
  const selectedStage = pipelineStages.find(
    (stage) => String(stage.id) === effectiveSelectedStageId,
  );
  const stageItems = pipelineStages.map((stage) => ({
    value: String(stage.id),
    label: stage.name,
  }));
  const selectedStageName =
    selectedStage?.name ?? candidate.stageName ?? "Select stage";

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight text-slate-950 dark:text-neutral-50">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-neutral-400">
              <span className="truncate">
                {candidate.jobTitle ?? "Unknown position"}
              </span>
              <Badge
                className={`rounded-md border-none px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none ${
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
              <button
                type="button"
                onClick={onViewScores}
                disabled={!onViewScores}
                title="See the score breakdown"
                className="cursor-pointer rounded-md disabled:cursor-default"
              >
                <ScoreBadge
                  size="full"
                  total={candidate.totalScore}
                  scoredParts={candidate.scoredParts}
                  weightedParts={candidate.weightedParts}
                  knockedOut={candidate.knockedOut}
                  assessmentPassed={candidate.assessmentPassed}
                />
              </button>
              {offer && (
                <Badge
                  className={`${offerStyle?.bg} ${offerStyle?.text} rounded-md border-none px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none`}
                >
                  Offer {offer.status}
                </Badge>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-neutral-300">
              <a
                href={`mailto:${candidate.email}`}
                className="inline-flex min-w-0 items-center gap-2 font-medium hover:text-[var(--theme-color)]"
              >
                <HugeiconsIcon
                  icon={Mail01Icon}
                  className="size-5 shrink-0 text-theme dark:text-primary"
                />
                <span className="truncate">{candidate.email}</span>
              </a>
              <div className="inline-flex items-center gap-2 font-medium">
                <HugeiconsIcon
                  icon={CallIcon}
                  className="size-5 shrink-0 text-theme dark:text-primary"
                />
                <span>{candidate.phone ?? "No phone"}</span>
              </div>
              <div className="inline-flex items-center gap-2 font-medium">
                <HugeiconsIcon
                  icon={Clock01Icon}
                  className="size-5 shrink-0 text-theme dark:text-primary"
                />
                <span>Applied {formatDate(candidate.appliedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="cancel"
              disabled={!candidate.resumeUrl}
              onClick={onViewCv}
              className="h-9 gap-2 px-3.5 text-sm"
            >
              <HugeiconsIcon icon={File01Icon} className="size-4" strokeWidth={1.75} />
              View CV
            </Button>

            <Select
              items={stageItems}
              value={effectiveSelectedStageId}
              onValueChange={(value) => onStageChange(value ?? "")}
              disabled={
                !isManager || pipelineStages.length === 0 || moveStageMutation.isPending
              }
            >
              <SelectTrigger
                aria-label="Pipeline stage"
                className="h-9! rounded-md border border-slate-300 bg-transparent px-3 text-sm font-medium text-slate-700 shadow-none hover:bg-slate-50 focus:ring-0 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <SelectValue>{selectedStageName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stageItems.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasStageChange && (
              <>
                <Button
                  type="button"
                  variant="cancel"
                  disabled={moveStageMutation.isPending}
                  onClick={onCancelStageChange}
                  className="h-9 px-3.5 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={moveStageMutation.isPending}
                  onClick={onSaveStageChange}
                  className="h-9 gap-2 border-none bg-theme px-3.5 text-sm font-semibold text-white hover:bg-theme-hover"
                >
                  {moveStageMutation.isPending && <Spinner className="size-3.5" />}
                  {moveStageMutation.isPending ? "Saving" : "Save"}
                </Button>
              </>
            )}

            {isManager && (
              <>
                <Button
                  variant="cancel"
                  onClick={onEdit}
                  className="h-9 gap-2 px-3.5 text-sm"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
                  Edit
                </Button>
                <RowDeleteButton onClick={onDelete} className="h-9 px-3.5" />
              </>
            )}

            <span aria-hidden className="mx-1 hidden h-6 w-px bg-slate-300 lg:block dark:bg-neutral-700" />
            <Button
              variant="ghost"
              aria-label="Close"
              title="Close"
              onClick={onClose}
              className="size-9 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
