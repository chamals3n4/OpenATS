import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import { jobs } from "../../db/schema/jobs";
import { paraformCandidateLinks, paraformRoleLinks } from "../../db/schema/paraform";
import { paraformConnectionService } from "./paraform-connection.service";

export class RoleLinkConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleLinkConflictError";
  }
}

export type ParaformOverview = {
  connected: boolean;
  accountEmail: string | null;
  needsReconnect: boolean;
  roleLinks: Array<{
    id: number;
    paraformRoleId: string;
    paraformRoleTitle: string;
    jobId: number;
    jobTitle: string;
    candidatesImported: number;
  }>;
};

/** What the settings page shows. Read from OpenATS only, so it loads while Paraform is down. */
export const paraformService = {
  async overview(): Promise<ParaformOverview> {
    const [connection, roleLinks] = await Promise.all([
      paraformConnectionService.getRow(),
      db
        .select({
          id: paraformRoleLinks.id,
          paraformRoleId: paraformRoleLinks.paraformRoleId,
          paraformRoleTitle: paraformRoleLinks.paraformRoleTitle,
          jobId: paraformRoleLinks.jobId,
          jobTitle: jobs.title,
          candidatesImported: count(paraformCandidateLinks.id),
        })
        .from(paraformRoleLinks)
        .innerJoin(jobs, eq(jobs.id, paraformRoleLinks.jobId))
        .leftJoin(
          paraformCandidateLinks,
          eq(paraformCandidateLinks.roleLinkId, paraformRoleLinks.id),
        )
        .groupBy(paraformRoleLinks.id, jobs.title)
        .orderBy(paraformRoleLinks.paraformRoleTitle),
    ]);

    return {
      connected: connection !== null,
      accountEmail: connection?.accountEmail ?? null,
      needsReconnect: connection?.needsReconnect ?? false,
      roleLinks,
    };
  },

  /** Imports one Paraform role's submissions into one job. Each side can be linked only once. */
  async linkRole(
    input: { paraformRoleId: string; paraformRoleTitle: string; jobId: number },
    userId: number,
  ) {
    const [job] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.id, input.jobId))
      .limit(1);
    if (!job) throw new RoleLinkConflictError("That job no longer exists.");

    const inserted = await db
      .insert(paraformRoleLinks)
      .values({ ...input, createdBy: userId })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) {
      throw new RoleLinkConflictError(
        "That Paraform role or that job is already linked.",
      );
    }
    return inserted[0];
  },

  /** Stops importing for a role. Candidates already imported stay, with their Paraform link. */
  async unlinkRole(id: number): Promise<boolean> {
    const deleted = await db
      .delete(paraformRoleLinks)
      .where(eq(paraformRoleLinks.id, id))
      .returning();
    return deleted.length > 0;
  },
};
