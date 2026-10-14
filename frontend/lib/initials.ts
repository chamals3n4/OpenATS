export function initialsOf(first?: string | null, last?: string | null, fallback = "?"): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  return (a + b).toUpperCase() || fallback.trim().charAt(0).toUpperCase() || "?";
}
