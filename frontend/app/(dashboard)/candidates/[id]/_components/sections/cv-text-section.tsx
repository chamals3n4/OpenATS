"use client";

import type { CandidateCvText } from "@/types";

/** Why there is no text to show, in words a recruiter can act on. */
function notice(cvText: CandidateCvText | null, hasResume: boolean): string | null {
  if (!hasResume) return "This candidate has no CV.";
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

const EDUCATION_LABELS: Record<string, string> = {
  secondary: "Secondary school",
  diploma: "Diploma",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  doctorate: "Doctorate",
};

/** "About 5 years", or "Under 1 year". Never a bare number, which would read as a fact. */
export function experienceLabel(years: number | null | undefined): string {
  if (years === null || years === undefined) return "Not found";
  if (years < 1) return "Under 1 year";
  const rounded = Math.round(years);
  return `About ${rounded} ${rounded === 1 ? "year" : "years"}`;
}

function Estimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-300 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
      <dt className="text-xs font-medium text-slate-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

const textCls =
  "whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800 dark:text-neutral-200";

/** The text read from the candidate's CV on the server: what CV search looks through. */
export function CvTextSection({
  cvText,
  hasResume,
}: {
  cvText: CandidateCvText | null;
  hasResume: boolean;
}) {
  const message = notice(cvText, hasResume);
  const sections = cvText?.sections ?? [];

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
          CV text
        </h3>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-neutral-400">
          Read from the CV file. This is what candidate search looks through.
        </p>
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
          <p className="mb-6 text-xs text-slate-500 dark:text-neutral-400">
            Estimated from the dates and qualifications written in the CV. Check the CV before relying on them. They are not part of the score.
          </p>

          {sections.length > 0 ? (
            <div className="space-y-5">
              {sections.map((section, index) => (
                <section key={index}>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                    {section.heading ?? SECTION_TITLES[section.key] ?? "Other"}
                  </h4>
                  <pre className={textCls}>{section.text}</pre>
                </section>
              ))}
            </div>
          ) : (
            <pre className={textCls}>{cvText?.text}</pre>
          )}
        </>
      )}
    </div>
  );
}
