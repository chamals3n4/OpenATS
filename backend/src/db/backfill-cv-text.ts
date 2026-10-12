import "dotenv/config";
import { and, eq, isNotNull, isNull, lt, notInArray, or } from "drizzle-orm";
import { db } from "./index";
import { candidateCvText, candidates } from "./schema";
import { EXTRACTOR_VERSION } from "../modules/candidate/cv-text";
import { requestCvExtraction } from "../queues/cv-extract/queue";

/**
 * Queues every CV whose text has not been read by the current version of the extractor: CVs
 * uploaded before this existed, ones that failed, and all of them after EXTRACTOR_VERSION is
 * raised. The worker (`pnpm dev:worker`) has to be running to do the reading.
 *
 *   pnpm tsx src/db/backfill-cv-text.ts
 */
async function main() {
  const rows = await db
    .select({ id: candidates.id, resumeUrl: candidates.resumeUrl })
    .from(candidates)
    .leftJoin(
      candidateCvText,
      and(
        eq(candidateCvText.candidateId, candidates.id),
        eq(candidateCvText.resumeUrl, candidates.resumeUrl),
      ),
    )
    .where(
      and(
        isNotNull(candidates.resumeUrl),
        or(
          isNull(candidateCvText.id),
          notInArray(candidateCvText.status, ["done", "empty"]),
          lt(candidateCvText.extractorVersion, EXTRACTOR_VERSION),
        ),
      ),
    );

  for (const { id, resumeUrl } of rows) {
    if (resumeUrl) await requestCvExtraction({ candidateId: id, resumeUrl });
  }
  console.log(`Queued ${rows.length} CV(s) to have their text read.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
