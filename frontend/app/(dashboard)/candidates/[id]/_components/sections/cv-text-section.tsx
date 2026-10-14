"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, Link01Icon, Mail01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import type { CandidateCvText } from "@/types";
import { formatCvSection, type CvBlock } from "../../_lib/cv-format";
import { countMatches, highlightParts, searchPattern } from "../../_lib/cv-highlight";

const SearchContext = createContext<RegExp | null>(null);

/** CV text with search matches marked */
function Hl({ children }: { children: string }) {
  const pattern = useContext(SearchContext);
  if (!pattern) return <>{children}</>;
  return (
    <>
      {highlightParts(children, pattern).map((part, index) =>
        part.match ? (
          <mark
            key={index}
            data-cv-match
            className="rounded-sm bg-amber-200 px-0.5 text-slate-950 data-[active]:bg-orange-400 dark:bg-amber-500/60 dark:text-white dark:data-[active]:bg-orange-500"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Why there is no text */
function notice(
  cvText: CandidateCvText | null,
  hasResume: boolean,
  workerMissing: boolean,
): string | null {
  if (!hasResume) return "This candidate has no CV.";
  // Worker is not running, so say that
  if (workerMissing && (!cvText || cvText.status === "pending")) {
    return "Waiting for the background worker, which is not running. This CV will be read, and will appear in CV search, once an administrator starts it.";
  }
  if (!cvText) return "The text of this CV has not been read yet.";
  if (cvText.status === "pending") return "Reading the CV. This usually takes a few seconds.";
  if (cvText.status === "empty") {
    return "No text could be read from this CV. It may be a scan or a photo, so this candidate will not appear in CV search.";
  }
  if (cvText.status === "failed") {
    return "This CV could not be read, so this candidate will not appear in CV search.";
  }
  return null;
}

const SECTION_TITLES: Record<string, string> = {
  header: "Top of the CV",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  projects: "Projects",
  languages: "Languages",
  references: "References",
  other: "Other",
};

/** Section heading from the CV, or our default */
const sectionTitle = (section: { key: string; heading: string | null }) =>
  section.heading ?? SECTION_TITLES[section.key] ?? "Other";

const EDUCATION_LABELS: Record<string, string> = {
  secondary: "Secondary school",
  diploma: "Diploma",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  doctorate: "Doctorate",
};

/** e.g. "About 5 years" */
export function experienceLabel(years: number | null | undefined): string {
  if (years === null || years === undefined) return "Not found";
  if (years < 1) return "Under 1 year";
  const rounded = Math.round(years);
  return `About ${rounded} ${rounded === 1 ? "year" : "years"}`;
}

const chipBase = "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium";
// Blue tags so they don't look like a status
const tagCls = `${chipBase} border-sky-200 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100`;
// Green so contacts don't look like tags
const contactCls = `${chipBase} border-emerald-200 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100`;
const bodyCls = "text-sm leading-6 text-slate-800 dark:text-neutral-200";
const cardCls = "rounded-md border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900";

function Estimate({ label, value }: { label: string; value: string }) {
  return (
    <div className={`min-w-0 px-4 py-3 ${cardCls}`}>
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span key={index} className={tagCls}>
          <span className="truncate"><Hl>{item}</Hl></span>
        </span>
      ))}
    </span>
  );
}

function Block({ block }: { block: CvBlock }) {
  if (block.type === "bullets") {
    return (
      <ul className={`list-disc space-y-1 pl-5 ${bodyCls}`}>
        {block.items.map((item, index) => (
          <li key={index} className="break-words"><Hl>{item}</Hl></li>
        ))}
      </ul>
    );
  }

  if (block.type === "entry") {
    return (
      <div className="pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <p className="min-w-0 break-words text-sm font-semibold text-slate-900 dark:text-neutral-100">
            <Hl>{block.title}</Hl>
          </p>
          {block.date && (
            <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-neutral-400">
              <Hl>{block.date}</Hl>
            </span>
          )}
        </div>
        {block.detail && <p className={`break-words ${bodyCls}`}><Hl>{block.detail}</Hl></p>}
        {block.tags.length > 0 && (
          <div className="mt-1.5">
            <Tags items={block.tags} />
          </div>
        )}
      </div>
    );
  }

  if (block.type === "tags") {
    return (
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
        {block.label && (
          <span className="shrink-0 text-xs font-medium text-slate-500 sm:w-36 dark:text-neutral-400">
            <Hl>{block.label}</Hl>
          </span>
        )}
        <Tags items={block.items} />
      </div>
    );
  }

  return <p className={`break-words ${bodyCls}`}><Hl>{block.text}</Hl></p>;
}

function Contacts({ contacts }: { contacts: NonNullable<CandidateCvText["contacts"]> }) {
  const items = [
    ...contacts.emails.map((value) => ({ icon: Mail01Icon, value })),
    ...contacts.phones.map((value) => ({ icon: Call02Icon, value })),
    ...contacts.links.map((value) => ({ icon: Link01Icon, value })),
  ];
  if (items.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span key={index} className={contactCls}>
          <HugeiconsIcon icon={item.icon} className="size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" />
          <span className="truncate"><Hl>{item.value}</Hl></span>
        </span>
      ))}
    </div>
  );
}

export function CvTextSection({
  cvText,
  hasResume,
  workerMissing = false,
}: {
  cvText: CandidateCvText | null;
  hasResume: boolean;
  workerMissing?: boolean;
}) {
  const message = notice(cvText, hasResume, workerMissing);
  const sections = useMemo(() => cvText?.sections ?? [], [cvText?.sections]);

  const [query, setQuery] = useState("");
  const pattern = useMemo(() => searchPattern(query), [query]);
  const matches = useMemo(() => {
    const contacts = cvText?.contacts;
    const shown = sections.length
      ? sections.flatMap((section) => [sectionTitle(section), section.text])
      : [cvText?.text ?? ""];
    return countMatches(
      [...shown, ...(contacts ? [...contacts.emails, ...contacts.phones, ...contacts.links] : [])],
      pattern,
    );
  }, [cvText, sections, pattern]);

  // Enter = next match, Shift+Enter = previous
  const body = useRef<HTMLDivElement>(null);
  const current = useRef(-1);
  const step = (direction: 1 | -1) => {
    const marks = body.current?.querySelectorAll<HTMLElement>("mark[data-cv-match]");
    if (!marks || marks.length === 0) return;
    marks.forEach((mark) => mark.removeAttribute("data-active"));
    current.current =
      current.current < 0
        ? direction === 1 ? 0 : marks.length - 1
        : (current.current + direction + marks.length) % marks.length;
    const mark = marks[current.current]!;
    mark.setAttribute("data-active", "");
    mark.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            CV Summary
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
            Read from the CV file. This is what candidate search looks through.
          </p>
        </div>
        {!message && (
          <div className="flex flex-wrap items-center gap-3 sm:flex-row-reverse">
            <div className="relative w-full sm:w-72">
              <HugeiconsIcon
                icon={Search01Icon}
                className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
              />
              <Input
                aria-label="Find in this CV"
                placeholder="Find in this CV"
                value={query}
                onChange={(e) => {
                  current.current = -1;
                  setQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
                  if (e.key === "Escape") setQuery("");
                }}
                className="pl-9 h-8! bg-gray-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 shadow-none rounded-md text-sm placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus-visible:ring-0"
              />
            </div>
            {pattern && (
              <p className="text-xs text-slate-500 dark:text-neutral-400" role="status">
                {matches === 0
                  ? "No matches"
                  : `${matches} ${matches === 1 ? "match" : "matches"}. Press Enter for the next one.`}
              </p>
            )}
          </div>
        )}
      </div>

      {message ? (
        <p className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          {message}
        </p>
      ) : (
        <>
          <dl className="mb-2 grid gap-3 sm:grid-cols-2">
            <Estimate label="Experience" value={experienceLabel(cvText?.experienceYears)} />
            <Estimate
              label="Highest education"
              value={(cvText?.educationLevel && EDUCATION_LABELS[cvText.educationLevel]) || "Not found"}
            />
          </dl>
          <p className="mb-5 text-xs text-slate-500 dark:text-neutral-400">
            Estimated from the dates and qualifications written in the CV. Check the CV before relying on them. They are not part of the score.
          </p>

          <SearchContext.Provider value={pattern}>
          <div ref={body}>
          {cvText?.contacts && <Contacts contacts={cvText.contacts} />}

          {sections.length > 0 ? (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <section key={index} className={`px-4 py-3 ${cardCls}`}>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    <Hl>{sectionTitle(section)}</Hl>
                  </h4>
                  <div className="space-y-2">
                    {formatCvSection(section.key, section.text).map((block, blockIndex) => (
                      <Block key={blockIndex} block={block} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <pre className={`whitespace-pre-wrap break-words font-sans ${bodyCls}`}>
              <Hl>{cvText?.text ?? ""}</Hl>
            </pre>
          )}
          </div>
          </SearchContext.Provider>
        </>
      )}
    </div>
  );
}
