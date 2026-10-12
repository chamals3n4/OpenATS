import { and, eq } from "drizzle-orm";
import { candidateCvText, db } from "../../db";
import { EXTRACTOR_VERSION, type ExtractedCv } from "./cv-text";

/** The stored text of each candidate's CV. Reading the file is in `cv-text/`. */
export const cvTextService = {
  /** Called when a CV arrives or is replaced: whatever was stored describes the old file. */
  async markPending(candidateId: number, resumeUrl: string): Promise<void> {
    const reset = {
      resumeUrl,
      status: "pending" as const,
      method: null,
      fileType: null,
      text: null,
      searchText: null,
      pageCount: null,
      charCount: null,
      errorMessage: null,
      updatedAt: new Date(),
    };
    await db
      .insert(candidateCvText)
      .values({ candidateId, ...reset })
      .onConflictDoUpdate({ target: candidateCvText.candidateId, set: reset });
  },

  /**
   * Saves a result, but only onto the row for the same file. If the CV was replaced while this one
   * was being read, the row now names the new file and this result is dropped.
   */
  async save(candidateId: number, resumeUrl: string, cv: ExtractedCv): Promise<void> {
    await db
      .update(candidateCvText)
      .set({
        status: cv.status,
        method: cv.method,
        fileType: cv.fileType,
        text: cv.text || null,
        searchText: cv.searchText || null,
        pageCount: cv.pageCount,
        charCount: cv.text.length,
        extractorVersion: EXTRACTOR_VERSION,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(candidateCvText.candidateId, candidateId), eq(candidateCvText.resumeUrl, resumeUrl)),
      );
  },

  async markFailed(candidateId: number, resumeUrl: string, message: string): Promise<void> {
    await db
      .update(candidateCvText)
      .set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(
        and(eq(candidateCvText.candidateId, candidateId), eq(candidateCvText.resumeUrl, resumeUrl)),
      );
  },

  async getForCandidate(candidateId: number) {
    const [row] = await db
      .select({
        status: candidateCvText.status,
        method: candidateCvText.method,
        text: candidateCvText.text,
        pageCount: candidateCvText.pageCount,
      })
      .from(candidateCvText)
      .where(eq(candidateCvText.candidateId, candidateId));
    return row ?? null;
  },
};
