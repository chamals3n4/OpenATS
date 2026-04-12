import type { PipelineStage } from "@/types";

/** Background + text (+ hover) for stage pills — aligned with pipeline column dot semantics. */
const STAGE_BADGE: Record<PipelineStage["stageType"], string> = {
  none:
    "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800",
  /** Early pipeline (Applied, inbox) — warm amber so it’s not confused with interview blue. */
  source:
    "bg-amber-100 dark:bg-amber-950/45 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/45",
  assessment:
    "bg-violet-100 dark:bg-violet-950/45 text-violet-800 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-950/45",
  interview:
    "bg-blue-100 dark:bg-blue-950/45 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/45",
  offer:
    "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/45",
  rejection:
    "bg-red-100 dark:bg-red-950/45 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/45",
};

/**
 * When a stage is still typed "none" in job settings, guess from the display name
 * so labels like "Applied" / "Interviewed" still get distinct colors.
 */
function effectiveStageType(
  stageType: PipelineStage["stageType"] | null | undefined,
  stageName: string | null | undefined,
): PipelineStage["stageType"] {
  if (stageType && stageType !== "none") {
    return stageType;
  }

  const n = (stageName ?? "").trim().toLowerCase();
  if (!n) return "none";

  if (/\breject(ed|ion)?\b/.test(n) || n.includes("rejection")) {
    return "rejection";
  }
  if (/\boffer\b/.test(n) || n.endsWith(" offer")) {
    return "offer";
  }
  if (n.includes("interview")) {
    return "interview";
  }
  if (n.includes("assessment") || /\btest\b/.test(n) || n.includes("exam")) {
    return "assessment";
  }
  if (
    n.includes("applied") ||
    n.includes("application") ||
    n.includes("applicant") ||
    n.includes("sourcing") ||
    n.includes("inbox") ||
    n === "new" ||
    n.startsWith("new ")
  ) {
    return "source";
  }

  return "none";
}

export function stageBadgeToneClasses(
  stageType: PipelineStage["stageType"] | null | undefined,
  stageName?: string | null,
): string {
  const t = effectiveStageType(stageType, stageName);
  return STAGE_BADGE[t];
}
