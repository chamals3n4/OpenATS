// Startup checks for the server-side environment. Mirrors
// backend/src/config/env.ts: fail fast with a clear message instead of
// starting a server that cannot sign anyone in.

const MIN_SECRET_LENGTH = 32;

type EnvSource = Record<string, string | undefined>;

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Returns one message per problem; empty when the environment is usable. */
export function checkEnv(env: EnvSource): string[] {
  const issues: string[] = [];

  if (!env.DATABASE_URL) {
    issues.push("DATABASE_URL: DATABASE_URL is required");
  }

  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    issues.push("BETTER_AUTH_SECRET: BETTER_AUTH_SECRET is required");
  } else if (secret.length < MIN_SECRET_LENGTH) {
    issues.push(
      `BETTER_AUTH_SECRET: must be at least ${MIN_SECRET_LENGTH} characters (generate one with: openssl rand -base64 32)`,
    );
  }

  const baseUrl = env.BETTER_AUTH_URL;
  if (!baseUrl) {
    issues.push("BETTER_AUTH_URL: BETTER_AUTH_URL is required");
  } else if (!isUrl(baseUrl)) {
    issues.push("BETTER_AUTH_URL: BETTER_AUTH_URL must be a valid URL");
  }

  return issues;
}

export function validateEnv(): void {
  const issues = checkEnv(process.env);
  if (issues.length === 0) return;

  console.error(
    `\nMissing or invalid environment variables:\n${issues
      .map((issue) => `  - ${issue}`)
      .join("\n")}\n\nCheck frontend/.env against frontend/.env.example.\n`,
  );
  process.exit(1);
}
