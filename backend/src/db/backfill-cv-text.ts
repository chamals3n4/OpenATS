import "dotenv/config";
import { and, eq, isNotNull, isNull, lt, notInArray, or } from "drizzle-orm";
import { db } from "./index";
import { candidateCvText, candidates } from "./schema";
import { EXTRACTOR_VERSION } from "../modules/candidate/cv-text";
import { cvTextService } from "../modules/candidate/cv-text.service";
import { requestCvExtraction } from "../queues/cv-extract/queue";

/**
 * Queues every CV whose text has not been read by the current version of the extractor: CVs
 * uploaded before this existed, ones that failed, and all of them after EXTRACTOR_VERSION is
 * raised. The worker (`pnpm dev:worker`) has to be running to do the reading.
 *
 *   pnpm tsx src/db/backfill-cv-text.ts
 *
 * With `--reparse` it reads no files and needs no worker: it works out the sections, years of
 * experience, education level and search terms again from the text already stored. Run that after
 * changing those rules.
 *
 *   pnpm tsx src/db/backfill-cv-text.ts --reparse
 */
async function main() {
  if (process.argv.includes("--reparse")) {
    console.log(`Worked out the details of ${await cvTextService.reparseAll()} stored CV(s) again.`);
    process.exit(0);
  }

  const rows = await db
    .select({ id: candidates.id, resumeKey: candidates.resumeKey })
    .from(candidates)
    .leftJoin(
      candidateCvText,
      and(
        eq(candidateCvText.candidateId, candidates.id),
        eq(candidateCvText.resumeKey, candidates.resumeKey),
      ),
    )
    .where(
      and(
        isNotNull(candidates.resumeKey),
        or(
          isNull(candidateCvText.id),
          notInArray(candidateCvText.status, ["done", "empty"]),
          lt(candidateCvText.extractorVersion, EXTRACTOR_VERSION),
        ),
      ),
    );

  for (const { id, resumeKey } of rows) {
    if (resumeKey) await requestCvExtraction({ candidateId: id, resumeKey });
  }
  console.log(`Queued ${rows.length} CV(s) to have their text read.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
