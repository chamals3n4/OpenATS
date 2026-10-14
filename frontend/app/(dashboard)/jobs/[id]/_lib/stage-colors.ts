import type { PipelineStage } from "@/types";

export type ColoredStage = PipelineStage & { color: string };

const STAGE_COLORS: Record<PipelineStage["stageType"], string> = {
  screening: "bg-amber-500",
  interview: "bg-blue-500",
  offer: "bg-green-500",
};

// Stages in order, with a colour for their type
export function withStageColors(stages: PipelineStage[]): ColoredStage[] {
  return [...stages]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((s) => ({ ...s, color: STAGE_COLORS[s.stageType] ?? "bg-slate-400" }));
}
