import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { pipelineStageTemplates } from "./schema";
import logger from "../utils/logger";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("Seeding pipeline stage templates...");

  await db.delete(pipelineStageTemplates);

  await db.insert(pipelineStageTemplates).values([
    {
      name: "Screening",
      position: 1,
      stageType: "screening",
      isDeletable: false,
    },
    {
      name: "Screening Qualified",
      position: 2,
      stageType: "screening",
      isDeletable: false,
    },
    {
      name: "Screening Disqualified",
      position: 3,
      stageType: "screening",
      isDeletable: false,
    },
    {
      name: "Interviews",
      position: 4,
      stageType: "interview",
      isDeletable: false,
    },
    {
      name: "Shortlisted",
      position: 5,
      stageType: "interview",
      isDeletable: false,
    },
    { name: "Offer", position: 6, stageType: "offer", isDeletable: false },
    { name: "Hired", position: 7, stageType: "offer", isDeletable: false },
  ]);

  logger.info("Pipeline stage templates seeded (7 default stages).");
  process.exit(0);
}

seed().catch((err) => {
  logger.error("Seed failed:", err);
  process.exit(1);
});
