import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { offers } from "../db/schema";
import type { NewOffer } from "../db/schema";

export const offerRepository = {
  async findById(id: number) {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer ?? null;
  },

  async findByCandidateAndJob(candidateId: number, jobId: number) {
    const [offer] = await db
      .select()
      .from(offers)
      .where(and(eq(offers.candidateId, candidateId), eq(offers.jobId, jobId)));
    return offer ?? null;
  },

  async findByReviewToken(token: string) {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.reviewToken, token));
    return offer ?? null;
  },

  async create(input: NewOffer) {
    const [created] = await db.insert(offers).values(input).returning();
    return created ?? null;
  },

  async updateById(id: number, data: Partial<NewOffer>) {
    const [updated] = await db
      .update(offers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return updated ?? null;
  },
};
