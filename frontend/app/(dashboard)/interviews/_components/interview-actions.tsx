"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, Message02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import type { InterviewListItem } from "@/types";

export function InterviewActions({
  interview,
  onFeedback,
  onEdit,
}: {
  interview: InterviewListItem;
  onFeedback: (iv: InterviewListItem) => void;
  onEdit: (iv: InterviewListItem) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="cancel"
        aria-label={`Add feedback for ${interview.candidateName}`}
        onClick={() => onFeedback(interview)}
        className="h-8 cursor-pointer gap-1.5 px-3 text-sm"
      >
        <HugeiconsIcon icon={Message02Icon} className="size-4" strokeWidth={1.75} />
        Feedback
      </Button>
      <Button
        type="button"
        variant="cancel"
        aria-label={`Edit the interview with ${interview.candidateName}`}
        onClick={() => onEdit(interview)}
        className="h-8 cursor-pointer gap-1.5 px-3 text-sm"
      >
        <HugeiconsIcon icon={Edit02Icon} className="size-4" strokeWidth={1.75} />
        Edit
      </Button>
    </div>
  );
}
