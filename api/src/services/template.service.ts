import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { templates } from "../db/schema";
import type { ContentBlock } from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";

export interface CreateTemplateInput {
  name: string;
  type:
    | "offer"
    | "offer_withdrawal"
    | "rejection"
    | "assessment_invite"
    | "assessment_completion"
    | "interview_invite"
    | "general"
    | "application_received";
  subject: string;
  bodyJson: ContentBlock[];
  isDefault?: boolean;
  createdBy: number;
}

export interface UpdateTemplateInput {
  name?: string | undefined;
  type?:
    | (
        | "offer"
        | "offer_withdrawal"
        | "rejection"
        | "assessment_invite"
        | "assessment_completion"
        | "interview_invite"
        | "general"
        | "application_received"
      )
    | undefined;
  subject?: string | undefined;
  bodyJson?: ContentBlock[] | undefined;
  isDefault?: boolean | undefined;
}



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

  async getDefaultByType(
    type:
      | "offer"
      | "offer_withdrawal"
      | "rejection"
      | "assessment_invite"
      | "assessment_completion"
      | "interview_invite"
      | "general"
      | "application_received",
  ) {
    const [template] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.type, type), eq(templates.isDefault, true)));
    return template ?? null;
  },

  async create(input: CreateTemplateInput) {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(templates)
        .values(clean(input))
        .returning();

      if (!created) {
        throw new Error("Failed to create template");
      }

      if (created.isDefault) {
        await tx
          .update(templates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(eq(templates.type, created.type), ne(templates.id, created.id)),
          );
      }

      return created;
    });
  },

  async update(id: number, input: UpdateTemplateInput) {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(templates)
        .where(eq(templates.id, id));
      if (!existing) return null;

      const [updated] = await tx
        .update(templates)
        .set({
          ...clean(input),
          updatedAt: new Date(),
        })
        .where(eq(templates.id, id))
        .returning();
      if (!updated) return null;

      if (input.isDefault === true) {
        await tx
          .update(templates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(eq(templates.type, updated.type), ne(templates.id, updated.id)),
          );
      }

      return updated;
    });
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();
    return deleted ?? null;
  },
};
