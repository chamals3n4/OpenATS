import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { candidateCvText, db } from "../../db";
import { EXTRACTOR_VERSION, type ExtractedCv } from "./cv-text";
import { normalizeForSearch } from "./cv-text/normalize-search";
import { buildCvProfile } from "./cv-text/profile";

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

/**
 * A condition on the `candidates` table: the CV shows at least this many years of work. A CV whose
 * years could not be worked out does not pass, since nothing is known about it either way.
 */
export function cvExperienceAtLeast(years: number): SQL {
  return sql`exists (
    select 1 from candidate_cv_text cvt
    where cvt.candidate_id = "candidates"."id" and cvt.experience_years >= ${years}
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
      sections: null,
      experienceYears: null,
      educationLevel: null,
      contacts: null,
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
        sections: cv.profile?.sections ?? null,
        experienceYears: cv.profile?.experienceYears ?? null,
        educationLevel: cv.profile?.educationLevel ?? null,
        contacts: cv.profile?.contacts ?? null,
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

  /**
   * Works out the sections, years, education and search terms again from the text already stored,
   * for every CV that has text. Used after changing those rules; no file is read again.
   */
  async reparseAll(): Promise<number> {
    const rows = await db
      .select({ id: candidateCvText.id, text: candidateCvText.text, resumeUrl: candidateCvText.resumeUrl })
      .from(candidateCvText)
      .where(eq(candidateCvText.status, "done"));

    for (const { id, text, resumeUrl } of rows) {
      if (!text) continue;
      const profile = buildCvProfile(text);
      await db
        .update(candidateCvText)
        .set({
          searchText: normalizeForSearch(text),
          sections: profile.sections,
          experienceYears: profile.experienceYears,
          educationLevel: profile.educationLevel,
          contacts: profile.contacts,
        })
        // The CV may have been replaced since the rows were read. These details describe the old
        // text, so they are only written while the row is still done and still for the same file.
        .where(
          and(
            eq(candidateCvText.id, id),
            eq(candidateCvText.status, "done"),
            eq(candidateCvText.resumeUrl, resumeUrl),
          ),
        );
    }
    return rows.length;
  },

  async getForCandidate(candidateId: number) {
    const [row] = await db
      .select({
        status: candidateCvText.status,
        method: candidateCvText.method,
        text: candidateCvText.text,
        pageCount: candidateCvText.pageCount,
        sections: candidateCvText.sections,
        experienceYears: candidateCvText.experienceYears,
        educationLevel: candidateCvText.educationLevel,
        contacts: candidateCvText.contacts,
      })
      .from(candidateCvText)
      .where(eq(candidateCvText.candidateId, candidateId));
    if (!row) return null;
    // Postgres hands a numeric back as text.
    return { ...row, experienceYears: row.experienceYears === null ? null : Number(row.experienceYears) };
  },
};
