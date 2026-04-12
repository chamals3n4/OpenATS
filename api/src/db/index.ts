import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import logger from "../utils/logger";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Prevent stale/dropped idle connections from crashing the process.
// Neon scales to zero and will silently drop idle connections; pg emits
// an 'error' event on the pool when that happens, which Node treats as
// an uncaught exception and terminates the process unless handled here.
pool.on("error", (err) => {
  logger.warn("[pg pool] idle client error (connection dropped):", err.message);
});

export const db = drizzle(pool, { schema });

/**
 * Ensures columns exist when the DB was provisioned before migration 0006
 * or drizzle migrate could not run the full chain. Idempotent.
 */
export async function ensureSchemaCompat(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const client = await pool.connect();
  try {
    await client.query(
      `ALTER TABLE "candidate_assessment_answers" ADD COLUMN IF NOT EXISTS "ai_feedback" text`,
    );
  } finally {
    client.release();
  }
}

export * from "./schema";
