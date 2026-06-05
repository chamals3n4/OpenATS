import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import logger from "../utils/logger";

const db = drizzle(process.env.DATABASE_URL!);

/**
 * Cleanup script for the stageType enum refactor.
 *
 * PROBLEM: After the stageType enum was changed (removing "offer" and "rejection",
 * adding "applied" and "custom"), old rows in pipeline_stage_templates and
 * job_pipeline_stages still have the invalid enum values.
 *
 * This script:
 * 1. Updates any job_pipeline_stages with stageType "offer" → "custom"
 * 2. Updates any job_pipeline_stages with stageType "rejection" → "custom"
 * 3. Updates any job_pipeline_stages with stageType "source" → "applied"
 * 4. Deletes and re-seeds pipeline_stage_templates
 */
async function cleanup() {
  console.log("Cleaning up pipeline stages with invalid enum values...\n");

  // 1. Fix job pipeline stages
  const offerUpdate = await db.execute(
    sql`UPDATE job_pipeline_stages SET stage_type = 'custom' WHERE stage_type = 'offer'`,
  );
  console.log(`Fixed "offer" → "custom": ${offerUpdate.rowCount ?? 0} rows`);

  const rejectionUpdate = await db.execute(
    sql`UPDATE job_pipeline_stages SET stage_type = 'custom' WHERE stage_type = 'rejection'`,
  );
  console.log(
    `Fixed "rejection" → "custom": ${rejectionUpdate.rowCount ?? 0} rows`,
  );

  const sourceUpdate = await db.execute(
    sql`UPDATE job_pipeline_stages SET stage_type = 'applied' WHERE stage_type = 'source'`,
  );
  // sourceUpdate may fail if "source" was never in the enum — that's fine
  if (sourceUpdate.rowCount != null) {
    console.log(
      `Fixed "source" → "applied": ${sourceUpdate.rowCount ?? 0} rows`,
    );
  }

  // 2. Fix candidate statuses — set rejected candidates to proper status
  //    (this is a precaution; if any candidates were rejected via old stage flow)
  const statusUpdate = await db.execute(
    sql`UPDATE candidates SET status = 'rejected' WHERE current_stage_id IS NOT NULL AND id IN (
      SELECT c.id FROM candidates c
      JOIN job_pipeline_stages jps ON jps.id = c.current_stage_id
      WHERE jps.stage_type = 'custom' AND jps.name ILIKE '%reject%'
    ) AND status = 'active'`,
  );
  console.log(
    `Fixed candidate statuses: ${statusUpdate.rowCount ?? 0} rows`,
  );

  // 3. Re-seed templates
  const { pipelineStageTemplates } = await import("./schema");
  await db.delete(pipelineStageTemplates);
  await db.insert(pipelineStageTemplates).values([
    {
      name: "Applied",
      position: 1,
      stageType: "applied",
      isDeletable: false,
    },
    {
      name: "Screening",
      position: 2,
      stageType: "screening",
      isDeletable: true,
    },
    {
      name: "Interview",
      position: 3,
      stageType: "interview",
      isDeletable: true,
    },
    {
      name: "Assessment",
      position: 4,
      stageType: "assessment",
      isDeletable: true,
    },
  ]);
  console.log("\nPipeline stage templates re-seeded.\n");

  console.log("Cleanup complete! You can now create jobs normally.");
  process.exit(0);
}

cleanup().catch((err) => {
  logger.error("Cleanup failed:", err);
  process.exit(1);
});
