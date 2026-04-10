"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loading03Icon } from "@hugeicons/core-free-icons";

import type { CandidateCvAnalysisPayload } from "@/types";

const DONUT_MATCH = "#22c55e";
const DONUT_TRACK_LIGHT = "#e2e8f0";
const DONUT_TRACK_DARK = "#3f3f46";

const BREAKDOWN = [
  { key: "skills", label: "Skills vs job requirements", max: 55 },
  { key: "experience", label: "Experience fit", max: 25 },
  { key: "level", label: "Seniority level", max: 15 },
  { key: "certs", label: "Certifications", max: 5 },
] as const;

const BAR_COLORS: Record<(typeof BREAKDOWN)[number]["key"], string> = {
  skills: "#22c55e",
  experience: "#14b8a6",
  level: "#f59e0b",
  certs: "#ec4899",
};

/** Older failed rows may store raw Gemini JSON; keep the UI readable. */
function displayAnalysisError(message: string): string {
  if (
    /API_KEY_INVALID|API key not valid|generativelanguage\.googleapis/i.test(
      message,
    )
  ) {
    return "CV analysis failed: set a valid GEMINI_API_KEY in api/.env (Google AI Studio), restart the API, then upload the resume again or wait for re-analysis.";
  }
  if (message.length > 500) return `${message.slice(0, 480)}…`;
  return message;
}

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function SkillsAlignmentSection({
  matchedSkills,
  missingSkills,
}: {
  matchedSkills: string[];
  missingSkills: string[];
}) {
  if (matchedSkills.length === 0 && missingSkills.length === 0) return null;
  return (
    <div className="space-y-3.5">
      {matchedSkills.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium uppercase tracking-wide text-emerald-700/90 dark:text-emerald-400/90 mb-2">
            Strong alignment
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.map((s) => (
              <span
                key={s}
                className="text-[13px] font-normal px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/35 text-emerald-900 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/50"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {missingSkills.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium uppercase tracking-wide text-rose-700/90 dark:text-rose-400/90 mb-2">
            Gaps vs this job
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.map((s) => (
              <span
                key={s}
                className="text-[13px] font-normal px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200/70 dark:border-rose-900/45"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CandidateJobFitTab({
  resumeUrl,
  cv,
}: {
  resumeUrl: string | null;
  cv: CandidateCvAnalysisPayload | null;
}) {
  const { resolvedTheme } = useTheme();
  const donutTrack =
    resolvedTheme === "dark" ? DONUT_TRACK_DARK : DONUT_TRACK_LIGHT;

  if (!resumeUrl) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/40 px-4 py-8 text-center">
        <p className="text-[13px] font-normal text-slate-600 dark:text-neutral-400 leading-relaxed">
          No resume on file. Upload a resume on apply to get an automatic job
          fit summary.
        </p>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 px-4 py-8 text-center">
        <p className="text-[13px] font-normal text-slate-600 dark:text-neutral-400 leading-relaxed">
          Job fit has not run for this candidate yet.
        </p>
      </div>
    );
  }

  if (cv.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
        <HugeiconsIcon
          icon={Loading03Icon}
          className="size-10 text-emerald-600 animate-spin"
        />
        <div>
          <p className="text-[15px] font-medium text-slate-800 dark:text-neutral-200">
            Running analysis…
          </p>
          <p className="text-[13px] font-normal text-slate-500 dark:text-neutral-500 mt-1 max-w-[280px] mx-auto">
            Parsing the resume and comparing it to this job. Usually finishes
            in a few seconds.
          </p>
        </div>
      </div>
    );
  }

  if (cv.status === "failed") {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/25 px-4 py-4">
        <p className="text-[12px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
          Could not complete analysis
        </p>
        <p className="text-[13px] font-normal text-red-800 dark:text-red-200/90 mt-2 leading-relaxed whitespace-pre-wrap break-words">
          {displayAnalysisError(
            cv.errorMessage ??
              "An error occurred while analyzing this resume.",
          )}
        </p>
      </div>
    );
  }

  const score = cv.matchScore != null ? Math.round(Number(cv.matchScore)) : 0;
  const gap = Math.max(0, 100 - score);

  const pieData =
    score >= 100
      ? [{ name: "Match", value: 100 }]
      : score <= 0
        ? [{ name: "Gap", value: 100 }]
        : [
            { name: "Match", value: score },
            { name: "Gap", value: gap },
          ];

  const pieFills =
    score >= 100
      ? [DONUT_MATCH]
      : score <= 0
        ? [donutTrack]
        : [DONUT_MATCH, donutTrack];

  const bd = cv.scoreBreakdown;
  const matched = cv.matchedSkills ?? [];
  const missing = cv.missingSkills ?? [];

  return (
    <div className="space-y-5 font-normal">
      <SkillsAlignmentSection
        matchedSkills={matched}
        missingSkills={missing}
      />

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-gradient-to-b from-slate-50/80 to-white dark:from-neutral-900/50 dark:to-neutral-950 px-4 py-4">
        <p className="text-center text-[12px] font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
          Overall match
        </p>
        <div className="relative mx-auto w-full max-w-[220px] h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="88%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive
              >
                {pieFills.map((fill, i) => (
                  <Cell key={i} fill={fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pr-1"
            aria-hidden
          >
            <span
              className={`text-[2rem] font-semibold tabular-nums leading-none ${scoreTone(score)}`}
            >
              {score}
            </span>
            <span className="text-[12px] font-normal text-slate-500 dark:text-neutral-500 mt-1">
              out of 100
            </span>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-[12px] font-normal text-slate-600 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: DONUT_MATCH }}
            />
            Earned
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: donutTrack }}
            />
            Remaining
          </span>
        </div>
      </div>

      {bd && (
        <div>
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2.5">
            How the score breaks down
          </h3>
          <ul className="space-y-2.5">
            {BREAKDOWN.map(({ key, label, max }) => {
              const pts = bd[key];
              const pct = max > 0 ? Math.min(100, (pts / max) * 100) : 0;
              const color = BAR_COLORS[key];
              return (
                <li key={key}>
                  <div className="flex items-center justify-between gap-2 text-[13px] font-normal mb-1">
                    <span className="text-slate-700 dark:text-neutral-300 truncate">
                      {label}
                    </span>
                    <span className="tabular-nums text-slate-500 dark:text-neutral-500 shrink-0">
                      <span className="font-medium text-slate-800 dark:text-neutral-200">
                        {pts}
                      </span>
                      /{max}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
