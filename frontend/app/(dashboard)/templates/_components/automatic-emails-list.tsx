"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import { useSystemEmails } from "@/hooks/queries/use-templates";
import { useIsManager } from "@/hooks/use-role";

/** Automatic emails list */
export function AutomaticEmailsList() {
  const isManager = useIsManager();
  const { data, isLoading, isError } = useSystemEmails();
  const emails = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (isError) {
    return (
      <p role="alert" className="px-6 py-10 text-sm text-red-600 dark:text-red-400">
        Could not load the automatic emails. Reload the page to try again.
      </p>
    );
  }

  return (
    <div className="px-6 py-5">
      <p className="max-w-2xl text-sm text-slate-600 dark:text-neutral-400">
        OpenATS sends these to candidates by itself. You can change the subject and the message of each one.
        Details such as dates, and buttons such as “Choose a time”, are always added for you.
      </p>

      <ul className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-300 dark:divide-neutral-800 dark:border-neutral-700">
        {emails.map((email) => (
          <li key={email.purpose}>
            <Link
              href={`/templates/automatic/${email.purpose}`}
              aria-label={`${isManager ? "Edit" : "View"} the “${email.label}” email`}
              className="flex items-center gap-4 px-4 py-3.5 outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme dark:hover:bg-neutral-800/60 dark:focus-visible:bg-neutral-800/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">{email.label}</h2>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                      email.customised
                        ? "border-theme/30 bg-theme/10 text-theme dark:text-primary"
                        : "border-slate-300 bg-slate-100 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {email.customised ? "Edited" : "Default"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">{email.description}</p>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 shrink-0 text-slate-400 dark:text-neutral-500"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
