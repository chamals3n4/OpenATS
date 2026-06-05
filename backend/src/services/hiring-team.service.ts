import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { jobHiringTeam, users } from "../db/schema";

export const hiringTeamService = {
  async getByJobId(jobId: number) {
    const members = await db
      .select({
        id: jobHiringTeam.id,
        jobId: jobHiringTeam.jobId,
        userId: jobHiringTeam.userId,
        addedAt: jobHiringTeam.addedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: users.role,
      })
      .from(jobHiringTeam)
      .innerJoin(users, eq(jobHiringTeam.userId, users.id))
      .where(eq(jobHiringTeam.jobId, jobId));

    return members;
  },

  async add(jobId: number, userId: number) {
    const [added] = await db
      .insert(jobHiringTeam)
      .values({ jobId, userId })
      .returning();
    return added;
  },

  async remove(jobId: number, userId: number) {
    const [removed] = await db
      .delete(jobHiringTeam)
      .where(
        and(eq(jobHiringTeam.jobId, jobId), eq(jobHiringTeam.userId, userId)),
      )
      .returning();
    return removed ?? null;
  },

  async isMember(jobId: number, userId: number) {
    const [member] = await db
      .select()
      .from(jobHiringTeam)
      .where(
        and(eq(jobHiringTeam.jobId, jobId), eq(jobHiringTeam.userId, userId)),
      );
    return !!member;
  },
};
