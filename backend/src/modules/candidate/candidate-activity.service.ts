import { desc, eq } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type * as schema from "../../db/schema";
import { db } from "../../db";
import { candidateActivities } from "../../db/schema";

type TxLike = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

type CandidateActivityType =
  | "offer_created"
  | "offer_updated"
  | "offer_sent"
  | "offer_viewed"
  | "offer_accepted"
  | "offer_declined"
  | "candidate_hired";

export type CreateCandidateActivityInput = {
  candidateId: number;
  jobId: number;
  offerId?: number | null;
  stageId?: number | null;
  actorId?: number | null;
  eventType: CandidateActivityType;
  metadata?: Record<string, unknown> | null;
};

export const candidateActivityService = {
  async create(input: CreateCandidateActivityInput, tx?: TxLike) {
    const client = tx ?? db;
    const [created] = await client
      .insert(candidateActivities)
      .values({
        candidateId: input.candidateId,
        jobId: input.jobId,
        offerId: input.offerId ?? null,
        stageId: input.stageId ?? null,
        actorId: input.actorId ?? null,
        eventType: input.eventType,
        metadata: input.metadata ?? null,
      })
      .returning();

    return created ?? null;
  },

  async getByCandidate(candidateId: number) {
    return db.query.candidateActivities.findMany({
      where: eq(candidateActivities.candidateId, candidateId),
      orderBy: [desc(candidateActivities.createdAt)],
      with: {
        stage: true,
      },
    });
  },
};
