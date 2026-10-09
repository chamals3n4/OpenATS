import "dotenv/config";
import { db } from "./index";
import { candidates } from "./schema";
import { assessmentExecutionService } from "../modules/assessment-execution/assessment-execution.service";
import { scoringService } from "../modules/scoring/scoring.service";

/**
 * Recalculates every candidate's score parts, total and flags from their answers, ratings,
 * assessments and scorecards. Run it once after deploying a change to how scores are worked out,
 * so candidates who applied earlier are not left with old or empty scores:
 *
 *   pnpm tsx src/db/backfill-scores.ts
 */
async function main() {
  const expired = await assessmentExecutionService.expireStaleInvites();
  const rows = await db.select({ id: candidates.id }).from(candidates);
  for (const { id } of rows) await scoringService.recompute(id);
  console.log(`Re-scored ${rows.length} candidate(s); expired ${expired} unused assessment invitation(s).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
