// `catch` bindings are `unknown` under strict mode, so narrow before logging.
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// For a reply: only a plain Error our own code threw is meant to be read. A database error's message
// carries the query and its values, and other libraries' carry hosts and paths, so log those instead.
export function safeErrorMessage(err: unknown, fallback: string): string {
  const isOurs = err instanceof Error && err.constructor === Error && !err.cause && !("code" in err);
  return isOurs ? err.message : fallback;
}

// Postgres puts constraint violations in `code`, e.g. "23505" for a duplicate.
export function getErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
