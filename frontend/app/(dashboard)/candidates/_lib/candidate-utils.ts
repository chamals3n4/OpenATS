export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

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
