import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

export interface UpdateUserInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  avatarUrl?: string | null | undefined;
  role?: ("super_admin" | "hiring_manager" | "interviewer") | undefined;
}

const clean = <T extends object>(obj: T): any => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

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
    const [updated] = await db
      .update(users)
      .set({ ...clean(input), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated ?? null;
  },
};
