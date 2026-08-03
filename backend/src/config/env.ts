import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  ASGARDEO_JWKS_URL: z.string().url("ASGARDEO_JWKS_URL must be a valid URL"),
  ASGARDEO_ISSUER: z.string().min(1, "ASGARDEO_ISSUER is required"),

  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required"),
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL is required"),

  R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
  R2_PUBLIC_URL: z.string().min(1, "R2_PUBLIC_URL is required"),

  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().min(1, "RESEND_FROM_EMAIL is required"),

  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

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
