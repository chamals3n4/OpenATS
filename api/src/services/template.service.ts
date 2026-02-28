import { eq } from "drizzle-orm";
import { db } from "../db";
import { templates } from "../db/schema";
import type { ContentBlock } from "../db/schema";

export interface CreateTemplateInput {
  name: string;
  type: "offer" | "rejection" | "assessment_invite" | "general";
  subject: string;
  bodyJson: ContentBlock[];
  createdBy: number;
}

export interface UpdateTemplateInput {
  name?: string | undefined;
  type?: ("offer" | "rejection" | "assessment_invite" | "general") | undefined;
  subject?: string | undefined;
  bodyJson?: ContentBlock[] | undefined;
}

const clean = <T extends object>(obj: T): any => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

export const templateService = {
  async getAll() {
    return db.select().from(templates).orderBy(templates.createdAt);
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
