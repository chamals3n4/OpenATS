import { eq, or } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { cleanObject as clean } from "../../utils/object.utils";

export interface UpdateUserInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  avatarUrl?: string | null | undefined;
  isActive?: boolean | undefined;
}

export interface CreateUserInput {
  asgardeoUserId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
}

export const userService = {
  async getAll() {
    return db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.firstName);
  },

  async getById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },

  async getByAsgardeoId(asgardeoUserId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.asgardeoUserId, asgardeoUserId));
    return user ?? null;
  },

  async create(input: CreateUserInput) {
    const name = `${input.firstName} ${input.lastName}`.trim();
    // Reactivate soft-deleted row on re-creation rather than inserting a duplicate.
    const [existing] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, input.email),
          input.asgardeoUserId ? eq(users.asgardeoUserId, input.asgardeoUserId) : undefined,
        ),
      )
      .limit(1);

    if (existing) {
      const [reactivated] = await db
        .update(users)
        .set({
          asgardeoUserId: input.asgardeoUserId,
          name,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return reactivated;
    }

    const [created] = await db.insert(users).values({ ...input, name }).returning();
    return created;
  },

  async update(id: number, input: UpdateUserInput) {
    const updateData: Partial<typeof users.$inferInsert> = { ...clean(input), updatedAt: new Date() };

    if (input.firstName !== undefined || input.lastName !== undefined) {
      const user = await this.getById(id);
      if (user) {
        const firstName = input.firstName ?? user.firstName;
        const lastName = input.lastName ?? user.lastName;
        updateData.name = `${firstName} ${lastName}`.trim();
      }
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  },

  async deactivate(id: number) {
    const [updated] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  },
};
