import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../../db";
import { offers } from "../../db/schema";
import type { NewOffer, Offer } from "../../db/schema";

type OfferStatus = Offer["status"];

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

  /**
   * Changes an offer only while it is still in one of the `from` states, in one statement. Two
   * requests at once (accept and decline, or a double click) cannot both get through: the second
   * finds the status already changed and gets null.
   */
  async transition(id: number, from: OfferStatus[], data: Partial<NewOffer>) {
    const [updated] = await db
      .update(offers)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(offers.id, id), inArray(offers.status, from)))
      .returning();
    return updated ?? null;
  },

  /** Marks offers still waiting for an answer as expired once their date has passed. */
  async expireOverdue(now: Date) {
    return db
      .update(offers)
      .set({ status: "expired", updatedAt: now })
      .where(and(inArray(offers.status, ["sent", "viewed"]), lte(offers.expiresAt, now)))
      .returning({ id: offers.id, candidateId: offers.candidateId, jobId: offers.jobId });
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
