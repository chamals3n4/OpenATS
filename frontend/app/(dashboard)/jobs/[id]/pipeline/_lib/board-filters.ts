import type { BoardCandidate } from "@/types";
import { matchesSearch } from "./board-utils";

export type StatusFilter = "any" | BoardCandidate["status"];
export type AppliedFilter = "any" | "7d" | "30d" | "over30d";
export type StageTimeFilter = "any" | "3" | "7" | "14";

export interface BoardFilters {
  search: string;
  /** Stages to show as columns. Empty means all of them. */
  stageIds: number[];
  status: StatusFilter;
  applied: AppliedFilter;
  /** Candidates who have been in their stage at least this many days. */
  inStage: StageTimeFilter;
}

export const EMPTY_FILTERS: BoardFilters = {
  search: "",
  stageIds: [],
  status: "any",
  applied: "any",
  inStage: "any",
};

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "any", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "offered", label: "Offer made" },
  { value: "hired", label: "Hired" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const APPLIED_OPTIONS: { value: AppliedFilter; label: string }[] = [
  { value: "any", label: "Applied any time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "over30d", label: "Over 30 days ago" },
];

export const IN_STAGE_OPTIONS: { value: StageTimeFilter; label: string }[] = [
  { value: "any", label: "Any time in stage" },
  { value: "3", label: "3+ days in stage" },
  { value: "7", label: "7+ days in stage" },
  { value: "14", label: "14+ days in stage" },
];

const DAY = 86_400_000;

/** Whole days between an ISO date and now, never negative. */
export function daysSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY));
}

/** Days in the current stage, falling back to the day they applied when no move is recorded. */
export function daysInStage(c: BoardCandidate, now: number): number {
  return daysSince(c.stageEnteredAt ?? c.appliedAt, now);
}

/** True when a filter that narrows the candidates (not the stage columns) is on. */
export function hasCandidateFilters(f: BoardFilters): boolean {
  return (
    f.search.trim() !== "" || f.status !== "any" || f.applied !== "any" || f.inStage !== "any"
  );
}

/** How many filters besides the search box are on, for the "Clear filters" button. */
export function activeFilterCount(f: BoardFilters): number {
  return (
    (f.stageIds.length > 0 ? 1 : 0) +
    (f.status !== "any" ? 1 : 0) +
    (f.applied !== "any" ? 1 : 0) +
    (f.inStage !== "any" ? 1 : 0)
  );
}

export function matchesFilters(c: BoardCandidate, f: BoardFilters, now: number): boolean {
  if (!matchesSearch(c, f.search)) return false;
  if (f.status !== "any" && c.status !== f.status) return false;

  if (f.applied !== "any") {
    const age = daysSince(c.appliedAt, now);
    if (f.applied === "7d" && age > 7) return false;
    if (f.applied === "30d" && age > 30) return false;
    if (f.applied === "over30d" && age <= 30) return false;
  }

  if (f.inStage !== "any" && daysInStage(c, now) < Number(f.inStage)) return false;
  return true;
}
