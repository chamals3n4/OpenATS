/** Postgres error codes the app reacts to. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_EXCLUSION_VIOLATION = "23P01";

/** Drizzle wraps driver errors, so the Postgres code is often on a `cause` further down. */
export function hasPgCode(err: unknown, code: string): boolean {
  let current: unknown = err;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 12 && current && typeof current === "object"; depth++) {
    if (seen.has(current)) break;
    seen.add(current);
    if ((current as { code?: string }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
