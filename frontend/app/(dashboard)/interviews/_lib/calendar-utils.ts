/** Local date key like "2026-10-12" */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface GridDay {
  date: Date;
  key: string;
  /** False for days from other months */
  inMonth: boolean;
}

/** Whole weeks, Sunday first, covering the month. */
export function monthGrid(year: number, month: number): GridDay[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(year, month, 1 - first.getDay() + i);
    return { date, key: dayKey(date), inMonth: date.getMonth() === month };
  });
}

/** Scheduled interviews grouped by day */
export function groupByDay<T extends { scheduledAt: string | null }>(interviews: T[]): Map<string, T[]> {
  const byDay = new Map<string, T[]>();
  for (const interview of interviews) {
    if (!interview.scheduledAt) continue;
    const date = new Date(interview.scheduledAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    byDay.set(key, [...(byDay.get(key) ?? []), interview]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  }
  return byDay;
}
