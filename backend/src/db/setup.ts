import "dotenv/config";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { pipelineStageTemplates } from "./schema";
import { DEFAULT_STAGES } from "./default-stages";

/**
 * Gets a database ready to run OpenATS: applies any migrations not applied yet, then writes the
 * default pipeline stages if there are none. Safe to run on every start, which is what the Docker
 * setup step does: nothing that is already there is changed.
 *
 *   node dist/src/db/setup.js     (in the image)
 *   pnpm tsx src/db/setup.ts      (from source)
 *
 * Uses drizzle-orm's own migrator, so drizzle-kit (a development tool) is not needed. The
 * migrations are the committed drizzle/*.sql files.
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const db = drizzle(pool);
    const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("Database migrations are up to date.");

    const [{ count }] = (
      await db.select({ count: sql<number>`count(*)::int` }).from(pipelineStageTemplates)
    ) as [{ count: number }];
    if (count === 0) {
      await db.insert(pipelineStageTemplates).values(DEFAULT_STAGES);
      console.log(`Added the ${DEFAULT_STAGES.length} default pipeline stages.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Database setup failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
