import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";

/** The address candidates visit, with the two things people want to do with it. */
export function CareersLinkCard({ url }: { url: string }) {
  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5 sm:p-6 dark:border-neutral-700 dark:bg-neutral-900">
      <h2 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
        Your careers page
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
        This page lists every published job and lets candidates apply. It is live as soon as a job is published. Share the link anywhere.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-0 flex-1 basis-64 items-center rounded-md border border-slate-300 bg-gray-100 px-3 dark:border-neutral-600 dark:bg-neutral-800">
          <code className="truncate font-mono text-sm text-slate-900 dark:text-neutral-100">{url}</code>
        </div>
        <CopyButton text={url} label="careers page link" withText />
        <Button
          nativeButton={false}
          render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          className="h-9 shrink-0 gap-2 border-none bg-theme px-4 text-sm font-semibold text-white shadow-none hover:bg-theme-hover"
        >
          Open page
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={2} />
          <span className="sr-only">(opens in a new tab)</span>
        </Button>
      </div>
    </section>
  );
}
