import { and, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "../db";
import { templates, users } from "../db/schema";
import type { ContentBlock } from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";

export interface CreateTemplateInput {
  name: string;
  type:
    | "offer"
    | "offer_withdrawal"
    | "rejection"
    | "assessment_invite"
    | "general"
    | "application_received"
    | "assessment_completion"
    | "interview_invite";
  subject: string;
  bodyJson: ContentBlock[];
  createdBy: number;
  /** When true, clears other defaults for this `type` and marks this row. */
  isDefault?: boolean | undefined;
}

export interface UpdateTemplateInput {
  name?: string | undefined;
  type?:
    | (
        | "offer"
        | "offer_withdrawal"
        | "rejection"
        | "assessment_invite"
        | "general"
        | "application_received"
        | "assessment_completion"
        | "interview_invite"
      )
    | undefined;
  subject?: string | undefined;
  bodyJson?: ContentBlock[] | undefined;
  isDefault?: boolean | undefined;
}



export const templateService = {
  /**
   * Marks one template as the default for its type (others of the same type become non-default).
   */
  async setAsDefaultForType(templateId: number) {
    const existing = await this.getById(templateId);
    if (!existing) return null;

    await db.transaction(async (tx) => {
      await tx
        .update(templates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(templates.type, existing.type));
      await tx
        .update(templates)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(templates.id, templateId));
    });

    return this.getById(templateId);
  },

  async getDefaultTemplateIdForType(
    type:
      | "offer"
      | "offer_withdrawal"
      | "rejection"
      | "assessment_invite"
      | "general"
      | "application_received"
      | "assessment_completion"
      | "interview_invite",
  ): Promise<number | null> {
    const [row] = await db
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.type, type), eq(templates.isDefault, true)))
      .limit(1);
    return row?.id ?? null;
  },

  async getAll() {
    return db
      .select({
        ...getTableColumns(templates),
        createdByName: sql<string>`coalesce(nullif(trim(concat_ws(' ', ${users.firstName}, ${users.lastName})), ''), ${users.email}, 'Unknown')`,
      })
      .from(templates)
      .leftJoin(users, eq(templates.createdBy, users.id))
      .orderBy(templates.createdAt);
  },

  async getByType(type: string) {
    return db
      .select({
        ...getTableColumns(templates),
        createdByName: sql<string>`coalesce(nullif(trim(concat_ws(' ', ${users.firstName}, ${users.lastName})), ''), ${users.email}, 'Unknown')`,
      })
      .from(templates)
      .leftJoin(users, eq(templates.createdBy, users.id))
      .where(eq(templates.type, type as any));
  },

  async getById(id: number) {
    const [template] = await db
      .select({
        ...getTableColumns(templates),
        createdByName: sql<string>`coalesce(nullif(trim(concat_ws(' ', ${users.firstName}, ${users.lastName})), ''), ${users.email}, 'Unknown')`,
      })
      .from(templates)
      .leftJoin(users, eq(templates.createdBy, users.id))
      .where(eq(templates.id, id));
    return template ?? null;
  },

  async create(input: CreateTemplateInput) {
    const { isDefault, ...rest } = input;
    const [created] = await db
      .insert(templates)
      .values(clean(rest))
      .returning();

    if (!created) {
      throw new Error("Failed to create template");
    }
    if (isDefault === true) {
      return (await this.setAsDefaultForType(created.id)) ?? created;
    }
    return created;
  },

  async update(id: number, input: UpdateTemplateInput) {
    const { isDefault, ...fields } = input;
    const fieldPayload = clean(fields);

    if (isDefault === true) {
      if (Object.keys(fieldPayload).length > 0) {
        await db
          .update(templates)
          .set({ ...fieldPayload, updatedAt: new Date() })
          .where(eq(templates.id, id));
      }
      return (await this.setAsDefaultForType(id)) ?? null;
    }

    const setPayload: Record<string, unknown> = {
      ...fieldPayload,
      updatedAt: new Date(),
    };
    if (isDefault === false) {
      setPayload.isDefault = false;
    }

    const [updated] = await db
      .update(templates)
      .set(setPayload as typeof templates.$inferInsert)
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
