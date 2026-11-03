import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { pipelineStageTemplates } from "./schema";
import logger from "../utils/logger";
import { DEFAULT_STAGES } from "./default-stages";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("Seeding pipeline stage templates...");

  await db.delete(pipelineStageTemplates);

  await db.insert(pipelineStageTemplates).values(DEFAULT_STAGES);

  logger.info("Pipeline stage templates seeded (7 default stages).");
  process.exit(0);
}

seed().catch((err) => {
  logger.error("Seed failed:", err);
  process.exit(1);
});
