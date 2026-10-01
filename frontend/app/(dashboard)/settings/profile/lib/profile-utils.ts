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

/** One or two capital letters for an avatar: first name plus last name, else the first letter of what there is. */
export function initialsOf(first?: string | null, last?: string | null, fallback = "?"): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  return (a + b).toUpperCase() || fallback.trim().charAt(0).toUpperCase() || "?";
}

/** "September 2026" */
export function formatMemberSince(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export interface IdentityClaims {
  given_name?: string;
  family_name?: string;
  username?: string;
  sub?: string;
  email?: string;
  profile?: string;
  address?: { country?: string };
  roles?: unknown;
}

export interface ProfileIdentity {
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  username: string | null;
  country: string | null;
  avatarUrl: string | null;
  roles: string[];
}

/** What the sign-in provider says about the person, in the shape the profile shows. */
export function identityFromClaims(claims: IdentityClaims): ProfileIdentity {
  const firstName = claims.given_name?.trim() || null;
  const lastName = claims.family_name?.trim() || null;
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") || claims.username || claims.sub || "User";

  return {
    firstName,
    lastName,
    fullName,
    email: claims.email ?? null,
    username: claims.username ?? claims.sub ?? null,
    country: claims.address?.country?.trim() || null,
    avatarUrl: claims.profile || null,
    roles: Array.isArray(claims.roles)
      ? claims.roles.filter((r): r is string => typeof r === "string")
      : [],
  };
}
