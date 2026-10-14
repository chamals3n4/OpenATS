import type { BoardCandidate, PipelineStage } from "@/types";

/** Key for candidates whose stage was deleted */
export const NO_STAGE = -1;

export const stageKeyOf = (c: Pick<BoardCandidate, "currentStageId">) =>
  c.currentStageId ?? NO_STAGE;

/** Group by stage, keeping the order */
export function groupByStage(candidates: BoardCandidate[]): Map<number, BoardCandidate[]> {
  const groups = new Map<number, BoardCandidate[]>();
  for (const c of candidates) {
    const key = stageKeyOf(c);
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }
  return groups;
}

/** New list after a drop */
export function moveCard(
  candidates: BoardCandidate[],
  candidateId: number,
  toStageId: number,
  toIndex: number,
): BoardCandidate[] {
  const card = candidates.find((c) => c.id === candidateId);
  if (!card) return candidates;

  const groups = groupByStage(candidates);
  const fromStageId = stageKeyOf(card);
  const fromList = groups.get(fromStageId) ?? [];
  const fromIndex = fromList.findIndex((c) => c.id === candidateId);

  let index = toIndex;
  if (fromStageId === toStageId && fromIndex < toIndex) index -= 1;
  const target = (groups.get(toStageId) ?? []).filter((c) => c.id !== candidateId);
  index = Math.min(Math.max(index, 0), target.length);

  if (fromStageId === toStageId && index === fromIndex) return candidates;

  target.splice(index, 0, { ...card, currentStageId: toStageId });
  groups.set(toStageId, target);
  if (fromStageId !== toStageId) {
    groups.set(
      fromStageId,
      fromList.filter((c) => c.id !== candidateId),
    );
  }
  return [...groups.values()].flat();
}

/** Drop slot for the pointer position */
export function dropIndex(cards: { top: number; bottom: number }[], pointerY: number): number {
  const index = cards.findIndex((r) => pointerY < r.top + (r.bottom - r.top) / 2);
  return index === -1 ? cards.length : index;
}

export interface MoveEffects {
  createsOffer: boolean;
  sendsAssessment: boolean;
}

/** Offer and assessment stages need a confirm */
export function moveEffects(
  stage: Pick<PipelineStage, "id" | "stageType">,
  assessmentStageIds: ReadonlySet<number>,
): MoveEffects {
  return {
    createsOffer: stage.stageType === "offer",
    sendsAssessment: assessmentStageIds.has(stage.id),
  };
}

export const hasEffects = (e: MoveEffects) => e.createsOffer || e.sendsAssessment;

/** "just now", "5m ago", "3h ago", "2d ago", "3w ago". */
export function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export const fullName = (c: Pick<BoardCandidate, "firstName" | "lastName">) =>
  `${c.firstName} ${c.lastName}`.trim();

export function isFullyVisibleX(
  inner: { left: number; right: number },
  outer: { left: number; right: number },
): boolean {
  return inner.left >= outer.left && inner.right <= outer.right;
}

/** Stages you can bulk move to */
export function bulkMoveTargets<S extends { id: number }>(
  stages: S[],
  selected: Pick<BoardCandidate, "currentStageId">[],
): S[] {
  if (selected.length === 0) return stages;
  return stages.filter((s) => !selected.every((c) => stageKeyOf(c) === s.id));
}

/** Search by name or email */
export function matchesSearch(c: BoardCandidate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fullName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
}

/** Convert a visible slot to a slot in the full column */
export function toFullIndex(
  full: BoardCandidate[],
  visible: BoardCandidate[],
  visibleIndex: number,
): number {
  if (visible.length === full.length) return visibleIndex;
  if (visible.length === 0) return full.length;
  if (visibleIndex < visible.length) {
    return full.findIndex((c) => c.id === visible[visibleIndex].id);
  }
  return full.findIndex((c) => c.id === visible[visible.length - 1].id) + 1;
}
