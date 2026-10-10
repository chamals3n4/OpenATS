const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  hiring_manager: "Hiring manager",
  interviewer: "Interviewer",
};

/** "hiring_manager" becomes "Hiring manager"; an unknown role is tidied rather than shown raw. */
export function humanizeRole(role: string): string {
  const known = ROLE_LABELS[role];
  if (known) return known;
  const words = role.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

export { initialsOf } from "@/lib/initials";

/** "September 2026" */
export function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** "Ada Lovelace", or the fallback when there is no name at all. */
export function fullNameOf(
  first?: string | null,
  last?: string | null,
  fallback = "User",
): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ") || fallback;
}
