import { z } from "zod";

/** Whether a string is a key `shared/integrations/crypto.ts` can use: 32 bytes, base64 encoded. */
export function isEncryptionKey(value: string): boolean {
  const trimmed = value.trim();
  // Node's decoder skips characters that are not base64, so the alphabet is checked first.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) return false;
  return Buffer.from(trimmed, "base64").length === 32;
}

/** One proxy in front of the server: the usual setup, with Nginx or one load balancer. */
export const DEFAULT_TRUST_PROXY = 1;

/**
 * Reads TRUST_PROXY into the value Express takes for its "trust proxy" setting.
 *
 * Behind a proxy every request arrives from the proxy's address. Unless Express is told to trust
 * the X-Forwarded-For header the proxy adds, every visitor looks like the same one, and the
 * per-IP limits on the careers page are shared by everybody: the sixth applicant in a quarter of
 * an hour, anywhere, was refused.
 *
 *   a number   how many proxies are in front (1 by default)
 *   "false"    none: the server is reached directly, and the header is ignored
 *   a list     the addresses or subnets of the proxies, comma separated
 *
 * "true" is refused: it trusts whatever the header says, so anyone could give themselves a fresh
 * address on every request and never reach a limit. Returns null for a value that is none of these.
 */
export function parseTrustProxy(value: string | undefined): number | false | string[] | null {
  const raw = value?.trim();
  if (!raw) return DEFAULT_TRUST_PROXY;
  if (raw === "false" || raw === "0") return false;
  if (raw === "true") return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  const addresses = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  const looksLikeAddress = (entry: string) => /^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(entry) || ["loopback", "linklocal", "uniquelocal"].includes(entry);
  return addresses.length > 0 && addresses.every(looksLikeAddress) ? addresses : null;
}

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  AUTH_JWKS_URL: z.string().url("AUTH_JWKS_URL must be a valid URL"),
  AUTH_ISSUER: z.string().min(1, "AUTH_ISSUER is required"),

  // Checked here so a wrong key stops the server at start. It is only used when someone connects
  // Google Calendar, which would otherwise be the first anyone heard of it, long after setup.
  ENCRYPTION_KEY: z
    .string()
    .min(1, "ENCRYPTION_KEY is required. Generate one with: openssl rand -base64 32")
    .refine(
      isEncryptionKey,
      "ENCRYPTION_KEY must be 32 bytes, base64 encoded. Generate one with: openssl rand -base64 32",
    ),
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL is required"),

  R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  // CVs. This bucket must have no public access; see r2.service.ts.
  R2_PRIVATE_BUCKET_NAME: z.string().min(1, "R2_PRIVATE_BUCKET_NAME is required"),
  R2_PUBLIC_URL: z.string().min(1, "R2_PUBLIC_URL is required"),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().min(1, "RESEND_FROM_EMAIL is required"),

  // Optional. Without it the app runs normally and AI CV analysis cannot be turned on.
  GEMINI_API_KEY: z.string().optional(),

  // How many proxies (Nginx, a load balancer) sit in front of this server. See parseTrustProxy.
  TRUST_PROXY: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || parseTrustProxy(value) !== null,
      'TRUST_PROXY must be a number of proxies (for example 1), "false", or a list of proxy addresses',
    ),

  PORT: z.coerce.number().int().positive().default(8080),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    console.error(
      `\nMissing or invalid environment variables:\n${issues}\n\nCheck backend/.env against backend/.env.example.\n`,
    );
    process.exit(1);
  }

  return result.data;
}
