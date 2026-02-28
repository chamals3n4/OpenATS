import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { pipelineStageTemplates } from "./schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("Seeding pipeline stage templates...");

  await db
    .insert(pipelineStageTemplates)
    .values([
      { name: "Applied", position: 1, stageType: "none", isDeletable: false },
      { name: "Screening", position: 2, stageType: "none", isDeletable: true },
      {
        name: "Interviewed",
        position: 3,
        stageType: "none",
        isDeletable: true,
      },
      { name: "Offer", position: 4, stageType: "offer", isDeletable: true },
      {
        name: "Rejected",
        position: 5,
        stageType: "rejection",
        isDeletable: false,
      },
    ])
    .onConflictDoNothing();

  console.log("Pipeline stage templates seeded.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
