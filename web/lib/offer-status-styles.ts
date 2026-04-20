import type { PipelineStage } from "@/types";

/** Background + text (+ hover) for stage pills — aligned with pipeline column dot semantics. */
const STAGE_BADGE: Record<PipelineStage["stageType"], string> = {
  none: "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800",
  source: "bg-amber-100 dark:bg-amber-950/45 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/45",
  assessment: "bg-violet-100 dark:bg-violet-950/45 text-violet-800 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-violet-950/45",
  interview: "bg-blue-100 dark:bg-blue-950/45 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/45",
  offer: "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/45",
  rejection: "bg-red-100 dark:bg-red-950/45 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/45",
};

function effectiveStageType(
  stageType: PipelineStage["stageType"] | null | undefined,
  stageName: string | null | undefined,
): PipelineStage["stageType"] {
  if (stageType && stageType !== "none") return stageType;
  const n = (stageName ?? "").trim().toLowerCase();
  if (!n) return "none";
  if (/\breject(ed|ion)?\b/.test(n) || n.includes("rejection")) return "rejection";
  if (/\boffer\b/.test(n) || n.endsWith(" offer")) return "offer";
  if (n.includes("interview")) return "interview";
  if (n.includes("assessment") || /\btest\b/.test(n) || n.includes("exam")) return "assessment";
  if (n.includes("applied") || n.includes("application") || n.includes("applicant") || n.includes("sourcing") || n.includes("inbox") || n === "new" || n.startsWith("new ")) return "source";
  return "none";
}

export function stageBadgeToneClasses(
  stageType: PipelineStage["stageType"] | null | undefined,
  stageName?: string | null,
): string {
  return STAGE_BADGE[effectiveStageType(stageType, stageName)];
}

export const OFFER_STATUS_STYLES: Record<string, { bg: string; text: string }> =
  {
    draft: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
    },
    sent: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
    },
    pending: {
      bg: "bg-violet-50 dark:bg-violet-950/30",
      text: "text-violet-600 dark:text-violet-400",
    },
    accepted: {
      bg: "bg-green-50 dark:bg-green-950/30",
      text: "text-green-600 dark:text-green-400",
    },
    declined: {
      bg: "bg-red-50 dark:bg-red-950/30",
      text: "text-red-500 dark:text-red-400",
    },
    withdrawn: {
      bg: "bg-slate-50 dark:bg-neutral-800",
      text: "text-slate-500 dark:text-neutral-400",
    },
  };
