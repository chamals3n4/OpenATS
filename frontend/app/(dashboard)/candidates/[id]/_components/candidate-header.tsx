"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CallIcon,
  Mail01Icon,
  Clock01Icon,
  File01Icon,
  PencilEdit01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials, formatDate, OFFER_STATUS_STYLES } from "./constants";
import { useIsManager } from "@/hooks/use-role";

interface CandidateHeaderProps {
  candidate: any;
  offer: any;
  pipelineStages: any[];
  selectedStageId: string;
  effectiveSelectedStageId: string;
  hasStageChange: boolean;
  moveStageMutation: any;
  onStageChange: (value: string) => void;
  onCancelStageChange: () => void;
  onSaveStageChange: () => void;
  onViewCv: () => void;
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
  onClose,
  onEdit,
  onDelete,
}: CandidateHeaderProps) {
  const isManager = useIsManager();
  const offerStyle = offer
    ? (OFFER_STATUS_STYLES[offer.status] ?? OFFER_STATUS_STYLES.draft)
    : null;
  const initials = getInitials(candidate.firstName, candidate.lastName);
  const selectedStage = pipelineStages.find(
    (stage) => String(stage.id) === effectiveSelectedStageId,
  );
  const selectedStageName =
    selectedStage?.name ?? candidate.stageName ?? "Select stage";

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-950">
                  <span className="select-none text-sm font-bold">
                    {initials}
                  </span>
                </div>
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
                    {offer && (
                      <Badge
                        className={`${offerStyle?.bg} ${offerStyle?.text} rounded-md border-none px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-none`}
                      >
                        Offer {offer.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-neutral-300">
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
              type="button"
              size="sm"
              disabled={!candidate.resumeUrl}
              className="h-7 rounded-[6px] cursor-pointer border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onViewCv}
            >
              <HugeiconsIcon icon={File01Icon} className="size-3" />
              View CV
            </Button>
            <Select
              value={effectiveSelectedStageId}
              onValueChange={(value) => onStageChange(value ?? "")}
              disabled={
                !isManager || pipelineStages.length === 0 || moveStageMutation.isPending
              }
            >
              <SelectTrigger className="h-8 rounded-[6px] border-none bg-neutral-100 px-2.5 text-sm font-semibold leading-none text-slate-700 shadow-none hover:bg-neutral-200 focus:ring-0 dark:bg-neutral-800 dark:text-neutral-200">
                <SelectValue>{selectedStageName}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-[6px] border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {pipelineStages.map((stage) => (
                  <SelectItem
                    key={stage.id}
                    value={String(stage.id)}
                    className="text-sm"
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
                  onClick={onCancelStageChange}
                  className="h-7 cursor-pointer rounded-[6px] border-none bg-neutral-700 px-2.5 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={moveStageMutation.isPending}
                  onClick={onSaveStageChange}
                  className="h-7 cursor-pointer rounded-[6px] border-none bg-[var(--theme-color)] px-2.5 text-sm font-semibold leading-none text-white shadow-none hover:bg-[var(--theme-color-hover)]"
                >
                  {moveStageMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              className="h-7 cursor-pointer rounded-[6px] border-none bg-neutral-700 px-2.5 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600"
              onClick={onClose}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isManager}
              className="h-7 cursor-pointer rounded-[6px] border-none bg-neutral-700 px-2.5 text-sm font-semibold leading-none text-white shadow-none hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onEdit}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} className="size-3" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isManager}
              className="h-7 cursor-pointer rounded-[6px] border-none bg-red-600 px-2.5 text-sm font-semibold leading-none text-white shadow-none hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onDelete}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}