import "dotenv/config";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "./index";
import { jobs } from "./schema";
import { sanitizeJobDescription } from "../modules/job/job-description";

/**
 * Cleans the job descriptions that were saved before descriptions were cleaned on save. Run it
 * once when upgrading from v0.6.0:
 *
 *   pnpm tsx src/db/sanitize-job-descriptions.ts
 *
 * Safe to run again: a description that is already clean is left as it is.
 */
async function main() {
  const rows = await db
    .select({ id: jobs.id, description: jobs.description })
    .from(jobs)
    .where(isNotNull(jobs.description));

  let changed = 0;
  for (const { id, description } of rows) {
    const cleaned = sanitizeJobDescription(description);
    if (cleaned === description) continue;
    // updated_at is left alone: nobody edited the job.
    await db.update(jobs).set({ description: cleaned }).where(eq(jobs.id, id));
    changed++;
  }

  console.log(`Checked ${rows.length} job description(s), cleaned ${changed}.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
