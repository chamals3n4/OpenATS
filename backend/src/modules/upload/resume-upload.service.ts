import { and, eq, gt, lte } from "drizzle-orm";
import { db, resumeUploads } from "../../db";
import { r2Service } from "../../shared/services/r2.service";
import logger from "../../utils/logger";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Long enough to fill in the application form after choosing the file.
const UPLOAD_TTL_MS = 60 * 60 * 1000;

/**
 * CVs uploaded from the careers page that are not attached to an application yet. The applicant
 * is anonymous, so they are never told where the file is stored: they get this row's id, and the
 * apply request names it. A row exists only while the upload is waiting, so an id works once,
 * for one hour, and an applicant cannot name any file but the one they uploaded.
 */
export const resumeUploadService = {
  /** Records an uploaded file and returns the id the applicant sends back when applying. */
  async create(resumeKey: string, now: Date = new Date()): Promise<string> {
    const [row] = await db
      .insert(resumeUploads)
      .values({ resumeKey, expiresAt: new Date(now.getTime() + UPLOAD_TTL_MS) })
      .returning({ id: resumeUploads.id });
    return row!.id;
  },

  /**
   * Takes the upload for an application and returns the file's key, or null when the id is
   * unknown, expired or already used. Runs in the application's transaction: if the application
   * fails (the email already applied, say) the upload is still there for the next try.
   */
  async claim(id: string, tx: Tx, now: Date = new Date()): Promise<string | null> {
    const [row] = await tx
      .delete(resumeUploads)
      .where(and(eq(resumeUploads.id, id), gt(resumeUploads.expiresAt, now)))
      .returning({ resumeKey: resumeUploads.resumeKey });
    return row?.resumeKey ?? null;
  },

  /** Deletes the files of uploads that were never attached to an application. */
  async removeExpired(now: Date = new Date()): Promise<number> {
    const expired = await db
      .select({ id: resumeUploads.id, resumeKey: resumeUploads.resumeKey })
      .from(resumeUploads)
      .where(lte(resumeUploads.expiresAt, now));

    let removed = 0;
    for (const { id, resumeKey } of expired) {
      try {
        // The file first: if this fails the row stays, and the next check tries again.
        await r2Service.deleteResume(resumeKey);
        await db.delete(resumeUploads).where(eq(resumeUploads.id, id));
        removed++;
      } catch (error) {
        logger.error(
          `Failed to remove unused CV upload ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return removed;
  },
};
