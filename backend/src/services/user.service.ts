import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, NewUser } from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";

export interface UpdateUserInput {
  firstName?: string | undefined;
  lastName?: string | undefined;
  avatarUrl?: string | null | undefined;
  role?: "super_admin" | "hiring_manager" | "interviewer" | undefined;
  isActive?: boolean | undefined;
}

export interface CreateUserInput {
  asgardeoUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: "super_admin" | "hiring_manager" | "interviewer";
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
    const [created] = await db
      .insert(users)
      .values({ ...input, role: input.role ?? "interviewer" })
      .returning();
    return created;
  },

  async update(id: number, input: UpdateUserInput) {
    const [updated] = await db
      .update(users)
      .set({ ...clean(input), updatedAt: new Date() })
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
