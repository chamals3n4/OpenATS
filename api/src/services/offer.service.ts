import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { offers, candidates, jobs, templates } from "../db/schema";
import type { Offer } from "../db/schema/offers";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";
import { mailService } from "./mail.service";

/** Sends the rendered offer letter via Resend (see `mail.service.ts`). */
async function sendOfferEmailForOffer(offer: Offer): Promise<void> {
  if (!offer.renderedHtml) return;

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, offer.candidateId));
  if (!candidate) return;

  let subject = "Offer Letter";
  if (offer.templateId) {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, offer.templateId));
    if (template) {
      const context = await variableService.getContextForOffer(candidate.id, offer);
      subject = templateEngineService.replaceVariables(template.subject, context);
    }
  }

  await mailService.sendOfferEmail(candidate.email, subject, offer.renderedHtml);
}

export interface CreateOfferInput {
  candidateId: number;
  jobId: number;
  templateId?: number | null | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  payFrequency?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null | undefined;
  startDate?: string | null | undefined;
  expiryDate?: string | null | undefined;
  benefitsText?: string | null | undefined;
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
  benefitsText?: string | null | undefined;
  renderedHtml?: string | null | undefined;
}



export const offerService = {
  async getAllDetails() {
    return await db.query.offers.findMany({
      with: {
        candidate: {
          with: { currentStage: true },
        },
        job: {
          with: { department: true },
        },
        template: true,
      },
      orderBy: (offers, { desc }) => [desc(offers.createdAt)],
    });
  },

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

    const isSent = input.status === "sent";

    const [newOffer] = await db
      .insert(offers)
      .values(clean({
        status: "draft",
        ...input,
        renderedHtml,
        sentAt: isSent ? new Date() : null,
      }))
      .returning();

    if (!newOffer) throw new Error("Failed to create offer");

    if (isSent && newOffer.renderedHtml) {
      let subject = "Offer Letter";
      if (newOffer.templateId) {
        const [template] = await db
          .select()
          .from(templates)
          .where(eq(templates.id, newOffer.templateId));
        if (template) {
          const context = await variableService.getContextForOffer(candidate.id, newOffer);
          subject = templateEngineService.replaceVariables(template.subject, context);
        }
      }
      await mailService.sendOfferEmail(candidate.email, subject, newOffer.renderedHtml);
    }

    return newOffer;
  },

  async update(id: number, input: UpdateOfferInput) {
    const [existing] = await db.select().from(offers).where(eq(offers.id, id));
    if (!existing) return null;

    const updatedData: Record<string, unknown> = {
      ...clean(input),
      updatedAt: new Date(),
    };

    if (input.status === "sent" && existing.status !== "sent") {
      updatedData.sentAt = new Date();
    }

    const merged = { ...existing, ...input };
    const affectsOfferLetter =
      input.templateId !== undefined ||
      input.salary !== undefined ||
      input.currency !== undefined ||
      input.payFrequency !== undefined ||
      input.startDate !== undefined ||
      input.expiryDate !== undefined ||
      input.benefitsText !== undefined;

    if (merged.templateId && (affectsOfferLetter || !existing.renderedHtml)) {
      updatedData.renderedHtml = await this._renderOfferHtml(merged);
    }

    const [updated] = await db
      .update(offers)
      .set(updatedData as typeof offers.$inferInsert)
      .where(eq(offers.id, id))
      .returning();

    if (!updated) return null;

    // First transition to "sent" via PUT: send once. (Resend / repeat sends use PATCH /status only.)
    if (
      input.status === "sent" &&
      existing.status !== "sent" &&
      updated.renderedHtml
    ) {
      await sendOfferEmailForOffer(updated);
    }

    return updated;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(offers)
      .where(eq(offers.id, id))
      .returning();
    return deleted ?? null;
  },

  async updateStatus(id: number, status: "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn") {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    if (!offer) return null;

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

    if (!updated) return null;

    if (status === "sent" && updated.renderedHtml) {
      await sendOfferEmailForOffer(updated);
    }

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
