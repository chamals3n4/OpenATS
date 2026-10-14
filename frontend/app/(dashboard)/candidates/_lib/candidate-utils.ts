export type CandidateStatusFilter = "all" | "active" | "rejected";

export function getStatusLabel(status: CandidateStatusFilter): string {
  const labels: Record<CandidateStatusFilter, string> = {
    all: "All Statuses",
    active: "Active",
    rejected: "Rejected",
  };
  return labels[status];
}

/** Split a snippet into text and [[matches]]. Always shown as text */
export function splitSnippet(snippet: string): { text: string; match: boolean }[] {
  return snippet
    .split(/(\[\[.*?\]\])/)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("[[") && part.endsWith("]]") && part.length >= 4
        ? { text: part.slice(2, -2), match: true }
        : { text: part, match: false },
    );
}
