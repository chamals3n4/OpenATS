import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { cleanObject as clean } from "../../utils/object.utils";

export interface UpdateUserInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  avatarUrl?: string | null | undefined;
  isActive?: boolean | undefined;
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
