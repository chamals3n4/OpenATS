"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading03Icon,
  AiBeautifyIcon,
  CheckmarkBadge01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import type { AiSummary, CandidateCvAnalysisPayload } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

const VERDICT_CONFIG = {
  strong_fit: {
    label: "Strong Fit",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50",
    dot: "bg-emerald-500",
  },
  moderate_fit: {
    label: "Moderate Fit",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50",
    dot: "bg-amber-500",
  },
  weak_fit: {
    label: "Weak Fit",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/50",
    dot: "bg-orange-500",
  },
  not_recommended: {
    label: "Not Recommended",
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50",
    dot: "bg-rose-500",
  },
} as const;

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
                className="text-[13px] font-normal px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/35 text-emerald-900 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/50"
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
                className="text-[13px] font-normal px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200/70 dark:border-rose-900/45"
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

function AiOverviewDialog({
  aiSummary,
  score,
}: {
  aiSummary: AiSummary;
  score: number;
}) {
  const verdict = VERDICT_CONFIG[aiSummary.verdict] ?? VERDICT_CONFIG.moderate_fit;

  return (
    <DialogContent
      className="sm:max-w-[720px] gap-0 p-0 overflow-hidden"
      showCloseButton
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-neutral-800">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <HugeiconsIcon
              icon={AiBeautifyIcon}
              className="size-4 text-violet-500"
              strokeWidth={1.5}
            />
            <DialogTitle className="text-[15px] font-semibold text-slate-900 dark:text-neutral-100">
              AI Candidate Overview
            </DialogTitle>
          </div>
          <p className="text-[13px] text-slate-500 dark:text-neutral-400 leading-relaxed">
            {aiSummary.quickSummary}
          </p>
        </DialogHeader>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Verdict badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium ${verdict.bg} ${verdict.color}`}
        >
          <span className={`size-1.5 rounded-full ${verdict.dot}`} />
          {verdict.label} — {score}/100 match
        </div>

        {/* Strengths */}
        {aiSummary.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                className="size-3.5 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2}
              />
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Strengths
              </h4>
            </div>
            <ul className="space-y-1.5">
              {aiSummary.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {aiSummary.gaps.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="size-3.5 text-amber-600 dark:text-amber-400"
                strokeWidth={2}
              />
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Gaps & Considerations
              </h4>
            </div>
            <ul className="space-y-1.5">
              {aiSummary.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed">
                    {g}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hiring Signal */}
        <div className="rounded-lg bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <HugeiconsIcon
              icon={InformationCircleIcon}
              className="size-3.5 text-slate-500 dark:text-neutral-400"
              strokeWidth={2}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Hiring Signal
            </span>
          </div>
          <p className="text-[13px] text-slate-700 dark:text-neutral-300 leading-relaxed">
            {aiSummary.hiringSignal}
          </p>
        </div>
      </div>
    </DialogContent>
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
      <div className="rounded-md border border-dashed border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/40 px-4 py-8 text-center">
        <p className="text-[13px] font-normal text-slate-600 dark:text-neutral-400 leading-relaxed">
          No resume on file. Upload a resume on apply to get an automatic job
          fit summary.
        </p>
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 px-4 py-8 text-center">
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
      <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/25 px-4 py-4">
        <p className="text-[12px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
          Could not complete analysis
        </p>
        <p className="text-[13px] font-normal text-red-800 dark:text-red-200/90 mt-2 leading-relaxed">
          {cv.errorMessage ?? "An error occurred while analyzing this resume."}
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
    <div className="grid gap-5 font-normal xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
      <div className="space-y-5">
        <SkillsAlignmentSection
          matchedSkills={matched}
          missingSkills={missing}
        />

        {bd && (
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3">
              How the score breaks down
            </h3>
            <ul className="space-y-3">
              {BREAKDOWN.map(({ key, label, max }) => {
                const pts = bd[key];
                const pct = max > 0 ? Math.min(100, (pts / max) * 100) : 0;
                const color = BAR_COLORS[key];
                return (
                  <li key={key}>
                    <div className="flex items-center justify-between gap-2 text-[13px] font-normal mb-1.5">
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
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-neutral-800">
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

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-gradient-to-b from-slate-50/80 to-white dark:from-neutral-900/50 dark:to-neutral-950 px-5 py-5 xl:sticky xl:top-5 xl:self-start">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[12px] font-medium uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            Overall match
          </p>
          {cv.aiSummary && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-[12px] cursor-pointer border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:border-violet-800 dark:hover:text-violet-300 transition-colors"
                  />
                }
              >
                <HugeiconsIcon
                  icon={AiBeautifyIcon}
                  className="size-3.5"
                  strokeWidth={1.5}
                />
                AI Overview
              </DialogTrigger>
              <AiOverviewDialog aiSummary={cv.aiSummary} score={score} />
            </Dialog>
          )}
        </div>
        <div className="relative mx-auto h-[220px] w-full max-w-[270px]">
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
    </div>
  );
}
