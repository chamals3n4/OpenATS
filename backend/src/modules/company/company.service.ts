import { eq } from "drizzle-orm";
import { db } from "../../db";
import { company, departments } from "../../db";

const departmentsCache = new Map<
  string,
  {
    value: any[];
    expiresAt: number;
  }
>();
const DEPARTMENTS_CACHE_TTL_MS = 5 * 60_000;

export type UpdateCompanyInput = {
  name: string;
  email: string;
  website: string | null;
  phone?: string | null | undefined;
  address?: string | null | undefined;
  description?: string | null | undefined;
  logoUrl?: string | null | undefined;
};

export type CreateDepartmentInput = {
  name: string;
};

export type UpdateDepartmentInput = {
  name: string;
};

export const companyService = {
  async get() {
    const result = await db.select().from(company).limit(1);
    return result[0] ?? null;
  },

  async upsert(input: UpdateCompanyInput) {
    const existing = await db.select().from(company).limit(1);
    if (existing.length === 0) {
      const [created] = await db
        .insert(company)
        .values({
          ...input,
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }

    if (!existing[0]) {
      throw new Error("No existing company found to update.");
    }
    const [updated] = await db
      .update(company)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(company.id, existing[0].id))
      .returning();
    return updated;
  },
};

export const departmentService = {
  async getAll() {
    const cacheKey = "all";
    const cached = departmentsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const comp = await db.select().from(company).limit(1);
    if (!comp[0]) return [];

    const result = await db
      .select()
      .from(departments)
      .where(eq(departments.companyId, comp[0].id))
      .orderBy(departments.name);

    departmentsCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + DEPARTMENTS_CACHE_TTL_MS,
    });

    return result;
  },

  async create(input: CreateDepartmentInput) {
    departmentsCache.delete("all");
    const comp = await db.select().from(company).limit(1);
    if (!comp[0]) {
      throw new Error("Company must be set up before creating departments.");
    }

    const [created] = await db
      .insert(departments)
      .values({
        companyId: comp[0].id,
        name: input.name,
      })
      .returning();
    return created;
  },

  async update(id: number, input: UpdateDepartmentInput) {
    departmentsCache.delete("all");
    const [updated] = await db
      .update(departments)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: number) {
    departmentsCache.delete("all");
    const [deleted] = await db
      .delete(departments)
      .where(eq(departments.id, id))
      .returning();
    return deleted ?? null;
  },
};
