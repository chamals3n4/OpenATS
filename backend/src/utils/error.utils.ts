// `catch` bindings are `unknown` under strict mode, so narrow before logging.
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Postgres surfaces constraint violations as a `code` on the thrown driver
// error, e.g. "23505" for a unique violation.
export function getErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
