import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { offers, candidates, jobs, templates, users } from "../db/schema";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";

export interface CreateOfferInput {
  candidateId: number;
  jobId: number;
  templateId?: number | null | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  payFrequency?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null | undefined;
  startDate?: string | null | undefined; // ISO Date string
  expiryDate?: string | null | undefined; // ISO Date string
  status?: "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn" | undefined;
  createdBy: number;
}

export interface UpdateOfferInput {
  templateId?: number | null | undefined;
  status?: "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn" | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  payFrequency?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null | undefined;
  startDate?: string | null | undefined;
  expiryDate?: string | null | undefined;
  renderedHtml?: string | null | undefined;
}

const clean = <T extends object>(obj: T): any => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

export const offerService = {
  async getAllByJob(jobId: number) {
    return db
      .select()
      .from(offers)
      .where(eq(offers.jobId, jobId))
      .orderBy(desc(offers.createdAt));
  },

  async getById(id: number) {
    const [offer] = await db
      .select()
      .from(offers)
      .where(eq(offers.id, id));
    return offer ?? null;
  },

  async create(input: CreateOfferInput) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, input.candidateId));
    
    if (!candidate) throw new Error("Candidate not found");

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, input.jobId));
    
    if (!job) throw new Error("Job not found");

    let renderedHtml: string | null = null;
    if (input.templateId) {
      renderedHtml = await this._renderOfferHtml(input);
    }

    const [newOffer] = await db
      .insert(offers)
      .values(clean({
        status: "draft",
        ...input,
        renderedHtml,
      }))
      .returning();

    if (!newOffer) throw new Error("Failed to create offer");
    return newOffer;
  },

  async update(id: number, input: UpdateOfferInput) {
    const [existing] = await db.select().from(offers).where(eq(offers.id, id));
    if (!existing) return null;

    const updatedData = { ...clean(input), updatedAt: new Date() };

    // Re-render if template or key variables change
    if (input.templateId !== undefined || input.salary !== undefined) {
      const renderInput = { ...existing, ...input };
      updatedData.renderedHtml = await this._renderOfferHtml(renderInput);
    }

    const [updated] = await db
      .update(offers)
      .set(updatedData)
      .where(eq(offers.id, id))
      .returning();
    
    return updated ?? null;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(offers)
      .where(eq(offers.id, id))
      .returning();
    return deleted ?? null;
  },

  /**
   * Transition offer status (e.g., from draft to sent)
   */
  async updateStatus(id: number, status: "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn") {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    if (status === "sent") {
      updateData.sentAt = new Date();
    }

    const [updated] = await db
      .update(offers)
      .set(updateData)
      .where(eq(offers.id, id))
      .returning();
    
    return updated ?? null;
  },

  async _renderOfferHtml(input: any): Promise<string | null> {
    if (!input.templateId) return null;

    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, input.templateId));

    if (!template) return null;

    const context = await variableService.getContextForOffer(
      input.candidateId,
      input
    );

    return templateEngineService.renderHTML(
      template.bodyJson, 
      context
    );
  }
};
