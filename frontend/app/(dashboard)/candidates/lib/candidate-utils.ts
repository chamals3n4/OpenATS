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
