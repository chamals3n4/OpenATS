import type { CandidateFlagFilter } from "@/hooks/queries/use-candidates";
import type { Job } from "@/types";
import { getStatusLabel, type CandidateStatusFilter } from "./candidate-utils";

export type CandidateSort = "newest" | "score";
export type FlagChoice = CandidateFlagFilter | "any";

/** Everything the Candidates page can be narrowed by, apart from the search box. */
export interface CandidateFilterState {
  jobId: number | undefined;
  status: CandidateStatusFilter;
  sort: CandidateSort;
  /** 0-100. Undefined means no minimum. */
  minScore: number | undefined;
  flag: FlagChoice;
  fullyScored: boolean;
}

export const EMPTY_FILTERS: CandidateFilterState = {
  jobId: undefined,
  status: "all",
  sort: "newest",
  minScore: undefined,
  flag: "any",
  fullyScored: false,
};

export const FLAG_LABELS: Record<FlagChoice, string> = {
  any: "Any flags",
  flagged: "Flagged",
  knocked_out: "Does not meet requirements",
  failed_assessment: "Failed assessment",
  assessment_expired: "Assessment expired",
  none: "No flags",
};

export const FLAG_ORDER: FlagChoice[] = [
  "any",
  "flagged",
  "knocked_out",
  "failed_assessment",
  "assessment_expired",
  "none",
];

const STATUSES: CandidateStatusFilter[] = ["all", "active", "rejected"];

/** Reads the filters back from the address, ignoring anything that is not a valid value. */
export function parseFilterState(params: URLSearchParams): CandidateFilterState {
  const job = Number(params.get("job"));
  const status = params.get("status") as CandidateStatusFilter | null;
  const flag = params.get("flag") as FlagChoice | null;
  const minScore = params.get("minScore");
  const min = minScore === null || minScore.trim() === "" ? NaN : Number(minScore);

  return {
    jobId: Number.isInteger(job) && job > 0 ? job : undefined,
    status: status && STATUSES.includes(status) ? status : "all",
    sort: params.get("sort") === "score" ? "score" : "newest",
    minScore: Number.isFinite(min) ? Math.min(100, Math.max(0, min)) : undefined,
    flag: flag && FLAG_ORDER.includes(flag) ? flag : "any",
    fullyScored: params.get("fullyScored") === "true",
  };
}

/** The address form of the filters. Only what differs from the defaults is written. */
export function toFilterParams(state: CandidateFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.jobId) params.set("job", String(state.jobId));
  if (state.status !== "all") params.set("status", state.status);
  if (state.sort !== "newest") params.set("sort", state.sort);
  if (state.minScore !== undefined) params.set("minScore", String(state.minScore));
  if (state.flag !== "any") params.set("flag", state.flag);
  if (state.fullyScored) params.set("fullyScored", "true");
  return params;
}

export interface FilterChip {
  /** Which filter this chip clears. */
  key: "job" | "status" | "minScore" | "flag" | "fullyScored";
  label: string;
}

/** One chip per filter that is on, so the page always shows what the list is narrowed by. */
export function activeFilterChips(state: CandidateFilterState, jobs: Pick<Job, "id" | "title">[]): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.jobId) {
    chips.push({ key: "job", label: jobs.find((j) => j.id === state.jobId)?.title ?? "Selected position" });
  }
  if (state.status !== "all") chips.push({ key: "status", label: getStatusLabel(state.status) });
  if (state.minScore !== undefined) chips.push({ key: "minScore", label: `Score ${state.minScore}+` });
  if (state.flag !== "any") chips.push({ key: "flag", label: FLAG_LABELS[state.flag] });
  if (state.fullyScored) chips.push({ key: "fullyScored", label: "All parts scored" });
  return chips;
}

/** How many filters inside the Filters menu are on (the position and sort have their own controls). */
export function filtersMenuCount(state: CandidateFilterState): number {
  return (
    (state.status !== "all" ? 1 : 0) +
    (state.minScore !== undefined ? 1 : 0) +
    (state.flag !== "any" ? 1 : 0) +
    (state.fullyScored ? 1 : 0)
  );
}

/** Applies the change that removing a chip stands for. */
export function clearFilter(state: CandidateFilterState, key: FilterChip["key"]): CandidateFilterState {
  switch (key) {
    case "job":
      return { ...state, jobId: undefined };
    case "status":
      return { ...state, status: "all" };
    case "minScore":
      return { ...state, minScore: undefined };
    case "flag":
      return { ...state, flag: "any" };
    case "fullyScored":
      return { ...state, fullyScored: false };
  }
}

const FILTER_PARAM_KEYS = ["job", "status", "sort", "minScore", "flag", "fullyScored"] as const;

/** Whether the address carries any filter at all. */
export const hasFilterParams = (params: URLSearchParams) => FILTER_PARAM_KEYS.some((key) => params.has(key));

/**
 * The filters to use: those in the address when it has any, otherwise the ones saved last time, so
 * coming back to the page from anywhere restores them. Clearing every filter saves nothing, which
 * is what makes the list unfiltered again.
 */
export function resolveFilterState(url: URLSearchParams, stored: string | null): CandidateFilterState {
  return parseFilterState(hasFilterParams(url) ? url : new URLSearchParams(stored ?? ""));
}
