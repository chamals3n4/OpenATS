"use client";

import { useJobDeleteSummary } from "@/hooks/queries/use-jobs";

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** Says what else goes with the jobs: deleting one deletes its candidates and offers */
export function JobDeleteImpact({ ids, enabled }: { ids: number[]; enabled: boolean }) {
  const { data, isPending, isError } = useJobDeleteSummary(ids, enabled);

  let text = "All of their candidates, CVs and offers will be deleted too.";
  if (!isError && isPending) text = "Counting what will be deleted with it…";
  if (data) {
    const { candidates, offers } = data.data;
    text =
      candidates === 0 && offers === 0
        ? "No candidates or offers will be deleted with it."
        : `This also deletes ${plural(candidates, "candidate")}, with their CVs and history, and ${plural(offers, "offer")}.`;
  }

  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      {text}
    </p>
  );
}
