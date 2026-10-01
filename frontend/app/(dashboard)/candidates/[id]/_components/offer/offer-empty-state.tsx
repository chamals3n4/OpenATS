"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface OfferEmptyStateProps {
  candidateName: string;
  canCreate: boolean;
  isCreating: boolean;
  onCreate: () => void;
}

export function OfferEmptyState({
  candidateName,
  canCreate,
  isCreating,
  onCreate,
}: OfferEmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/30">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">
        <HugeiconsIcon
          icon={Award01Icon}
          className="size-5 text-slate-400 dark:text-neutral-500"
        />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
        No offer yet
      </p>
      <p className="mx-auto mt-1 max-w-[320px] text-sm text-slate-500 dark:text-neutral-400">
        {canCreate
          ? `${candidateName} is at the offer stage. Create a draft to set the salary, start date and letter.`
          : "Move the candidate to an offer stage to create their offer."}
      </p>
      {canCreate && (
        <Button
          onClick={onCreate}
          disabled={isCreating}
          className="mt-4 h-9 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white hover:bg-theme-hover"
        >
          {isCreating && <Spinner className="size-3.5" />}
          {isCreating ? "Creating" : "Create offer draft"}
        </Button>
      )}
    </div>
  );
}
