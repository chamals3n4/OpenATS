export interface HistoryEntry {
  id: number;
  stageId: number;
  movedBy: number | null;
  movedAt: string;
}

export interface TimelineItem extends HistoryEntry {
  /** The newest entry: where the candidate is now. */
  isCurrent: boolean;
  /** The oldest entry: when the candidate entered the pipeline. */
  isFirst: boolean;
  /** How long the candidate was (or has been) in this stage. */
  durationMs: number;
}

/**
 * Turns the raw history into a newest-first timeline. Each entry's duration runs
 * until the next move, and the current stage runs until `now`.
 */
export function buildTimeline(
  history: HistoryEntry[],
  now: number,
): TimelineItem[] {
  const ascending = [...history].sort(
    (a, b) =>
      new Date(a.movedAt).getTime() - new Date(b.movedAt).getTime() ||
      a.id - b.id,
  );

  return ascending
    .map((entry, i) => {
      const start = new Date(entry.movedAt).getTime();
      const end = i < ascending.length - 1 ? new Date(ascending[i + 1].movedAt).getTime() : now;
      return {
        ...entry,
        isCurrent: i === ascending.length - 1,
        isFirst: i === 0,
        durationMs: Math.max(0, end - start),
      };
    })
    .reverse();
}

export interface TimelineSummary {
  current: TimelineItem | null;
  /** Time since the candidate entered the pipeline. */
  totalMs: number;
  /** Number of times the candidate was moved after applying. */
  moves: number;
}

export function summarizeTimeline(items: TimelineItem[]): TimelineSummary {
  const current = items.find((i) => i.isCurrent) ?? null;
  const first = items.find((i) => i.isFirst) ?? null;
  return {
    current,
    totalMs: current && first ? current.durationMs + sumBefore(items) : 0,
    moves: Math.max(0, items.length - 1),
  };
}

function sumBefore(items: TimelineItem[]) {
  return items.filter((i) => !i.isCurrent).reduce((sum, i) => sum + i.durationMs, 0);
}
