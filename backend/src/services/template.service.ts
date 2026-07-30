import { eq, ilike, inArray, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import { templates } from "../db/schema";
import type { TemplateBody } from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";

export interface CreateTemplateInput {
  name: string;
  type: "email" | "event";
  subject: string;
  bodyJson: TemplateBody;
  createdBy: number;
}

export interface UpdateTemplateInput {
  name?: string | undefined;
  type?: ("email" | "event") | undefined;
  subject?: string | undefined;
  bodyJson?: TemplateBody | undefined;
}

export type TemplateListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
};

export const templateService = {
  async getAll() {
    return db.select().from(templates).orderBy(templates.createdAt);
  },

  async getPaginated(filters: TemplateListFilters = {}) {
    const { page = 1, limit = 15, search, type } = filters;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) conditions.push(ilike(templates.name, `%${search}%`));
    if (type) conditions.push(eq(templates.type, type as any));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [countRow]] = await Promise.all([
      db.select().from(templates).where(where).orderBy(desc(templates.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(templates).where(where),
    ]);

    const total = countRow?.count ?? 0;
    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async deleteMany(ids: number[]) {
    if (ids.length === 0) return [];
    return db.delete(templates).where(inArray(templates.id, ids)).returning();
  },

  async getByType(type: string) {
    return db
      .select()
      .from(templates)
      .where(eq(templates.type, type as any));
  },

  async getById(id: number) {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id));
    return template ?? null;
  },

  async create(input: CreateTemplateInput) {
    const [created] = await db
      .insert(templates)
      .values(clean(input))
      .returning();

    if (!created) {
      throw new Error("Failed to create template");
    }
    return created;
  },

  async update(id: number, input: UpdateTemplateInput) {
    const [updated] = await db
      .update(templates)
      .set({
        ...clean(input),
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id))
      .returning();
    return updated ?? null;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();
    return deleted ?? null;
  },
};
