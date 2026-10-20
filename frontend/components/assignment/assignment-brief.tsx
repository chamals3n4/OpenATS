import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon, Time01Icon } from "@hugeicons/core-free-icons";
import type { AssignmentResource } from "@/types";

interface AssignmentBriefProps {
  title: string;
  description: string;
  resources: AssignmentResource[];
  /** What to say about the deadline, e.g. "7 days to hand in" or "Hand in by 12 May". */
  deadline: string;
}

/** Only web addresses become links, so a stored `javascript:` address can never be clicked. */
export const isWebUrl = (value: string) => /^https?:\/\//i.test(value.trim());

/**
 * What a candidate reads before they start. Used on the candidate's own page and, as a preview,
 * in the form the hiring team fills in, so the two cannot drift. The description is plain text.
 */
export function AssignmentBrief({ title, description, resources, deadline }: AssignmentBriefProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-neutral-100">
        {title.trim() || "Untitled assignment"}
      </h2>
      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-neutral-300">
        <HugeiconsIcon icon={Time01Icon} className="size-4 text-theme dark:text-primary" strokeWidth={1.75} />
        {deadline}
      </p>

      {description.trim() ? (
        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-slate-600 dark:text-neutral-300">
          {description}
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-400 dark:text-neutral-500">No description yet.</p>
      )}

      {resources.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Resources</h3>
          <ul className="mt-2 space-y-1.5">
            {resources.map((resource, index) => (
              <li key={index}>
                {isWebUrl(resource.url) ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-theme hover:underline dark:text-primary"
                  >
                    <HugeiconsIcon icon={LinkSquare01Icon} className="size-4" />
                    {resource.label || resource.url}
                  </a>
                ) : (
                  <span className="text-sm text-slate-500 dark:text-neutral-400">
                    {resource.label || "Link"} (add a full web address)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
