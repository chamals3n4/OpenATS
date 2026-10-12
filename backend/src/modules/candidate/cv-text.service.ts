import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { candidateCvText, db } from "../../db";
import { EXTRACTOR_VERSION, type ExtractedCv } from "./cv-text";
import { normalizeForSearch } from "./cv-text/normalize-search";

/**
 * Put around the matched words in a search snippet. Plain marks, not HTML: the text comes from a
 * file a stranger uploaded, so whoever shows it splits on these and never renders it as markup.
 */
export const SNIPPET_MARK = { start: "[[", end: "]]" } as const;

/**
 * What a recruiter typed, as a Postgres query. `websearch_to_tsquery` accepts anything without
 * raising an error, and understands "a phrase", OR and -word.
 */
function searchQuery(search: string): SQL {
  return sql`websearch_to_tsquery('english', ${normalizeForSearch(search)})`;
}

/**
 * A condition on the `candidates` table: this candidate's CV matches the search. Written as a
 * subquery with the table named in full, so it works in any query on `candidates`, joined or not.
 */
export function cvMatches(search: string): SQL {
  return sql`exists (
    select 1 from candidate_cv_text cvt
    where cvt.candidate_id = "candidates"."id" and cvt.search_vector @@ ${searchQuery(search)}
  )`;
}

/** How well this candidate's CV matches the search; null when they have no CV text. */
export function cvRank(search: string): SQL {
  return sql`(
    select ts_rank_cd(cvt.search_vector, ${searchQuery(search)})
    from candidate_cv_text cvt where cvt.candidate_id = "candidates"."id"
  )`;
}

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

  /**
   * The lines of each CV that match the search, with the matched words marked. Building these is
   * the slow part of a search, so it is asked for only the candidates on the page being shown.
   * Candidates whose CV does not match (they were found by name) are not in the result.
   */
  async snippets(candidateIds: number[], search: string): Promise<Map<number, string>> {
    if (candidateIds.length === 0) return new Map();

    const options =
      `StartSel="${SNIPPET_MARK.start}", StopSel="${SNIPPET_MARK.end}", ` +
      `MaxFragments=2, MaxWords=18, MinWords=6, FragmentDelimiter=" ... "`;
    const query = searchQuery(search);

    const rows = await db
      .select({
        candidateId: candidateCvText.candidateId,
        snippet: sql<string>`regexp_replace(
          ts_headline('english', ${candidateCvText.text}, ${query}, ${options}), '\\s+', ' ', 'g'
        )`,
      })
      .from(candidateCvText)
      .where(
        and(
          inArray(candidateCvText.candidateId, candidateIds),
          sql`${candidateCvText.searchVector} @@ ${query}`,
        ),
      );

    return new Map(rows.map((row) => [row.candidateId, row.snippet]));
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
