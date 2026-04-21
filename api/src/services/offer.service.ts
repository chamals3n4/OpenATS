import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { offers, candidates, jobs, templates, users, offerResponseAttempts } from "../db/schema";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";
import { offerResponseService } from "./offer-response.service";
import { templateService } from "./template.service";

export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateOfferInput {
  candidateId: number;
  jobId: number;
  templateId?: number | null | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  payFrequency?: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null | undefined;
  startDate?: string | null | undefined; 
  expiryDate?: string | null | undefined;
  benefits?: string | null | undefined;
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
  benefits?: string | null | undefined;
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

  async create(input: CreateOfferInput, executor: DbExecutor = db) {
    const [candidate] = await executor
      .select()
      .from(candidates)
      .where(eq(candidates.id, input.candidateId));
    
    if (!candidate) throw new Error("Candidate not found");

    const [job] = await executor
      .select()
      .from(jobs)
      .where(eq(jobs.id, input.jobId));
    
    if (!job) throw new Error("Job not found");

    const defaultTemplate = input.templateId
      ? null
      : await templateService.getDefaultByType("offer");
    const effectiveTemplateId = input.templateId ?? defaultTemplate?.id ?? null;

    let renderedHtml: string | null = null;
    if (effectiveTemplateId) {
      renderedHtml = await this._renderOfferHtml({
        ...input,
        templateId: effectiveTemplateId,
      });
    }

    const isSent = input.status === "sent";

    const [newOffer] = await executor
      .insert(offers)
      .values(clean({
        status: "draft",
        ...input,
        templateId: effectiveTemplateId,
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
      await offerResponseService.createOrRefreshForOffer({
        offerId: newOffer.id,
        candidateId: candidate.id,
        candidateEmail: candidate.email,
        candidateFirstName: candidate.firstName,
        renderedHtml: newOffer.renderedHtml,
        subject,
        expiryDate: newOffer.expiryDate,
      });
    }

    return newOffer;
  },

  async update(id: number, input: UpdateOfferInput) {
    const [existing] = await db.select().from(offers).where(eq(offers.id, id));
    if (!existing) return null;

    const updatedData = { ...clean(input), updatedAt: new Date() };

    let templateIdForRender = input.templateId ?? existing.templateId;
    if (templateIdForRender == null) {
      const defaultTemplate = await templateService.getDefaultByType("offer");
      templateIdForRender = defaultTemplate?.id ?? null;
    }

    if (
      input.templateId !== undefined ||
      input.salary !== undefined ||
      input.currency !== undefined ||
      input.payFrequency !== undefined ||
      input.startDate !== undefined ||
      input.expiryDate !== undefined ||
      input.benefits !== undefined
    ) {
      const renderInput = { ...existing, ...input, templateId: templateIdForRender };
      updatedData.renderedHtml = await this._renderOfferHtml(renderInput);
      if (existing.templateId == null && input.templateId === undefined && templateIdForRender != null) {
        updatedData.templateId = templateIdForRender;
      }
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

    if (status === "withdrawn") {
      await db
        .update(offerResponseAttempts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(offerResponseAttempts.offerId, id));
    }

    if (status === "sent" && updated.renderedHtml) {
      const [candidate] = await db.select().from(candidates).where(eq(candidates.id, updated.candidateId));
      if (candidate) {
        let subject = "Offer Letter";
        if (updated.templateId) {
          const [template] = await db.select().from(templates).where(eq(templates.id, updated.templateId));
          if (template) {
            const context = await variableService.getContextForOffer(candidate.id, updated);
            subject = templateEngineService.replaceVariables(template.subject, context);
          }
        }
        await offerResponseService.createOrRefreshForOffer({
          offerId: updated.id,
          candidateId: candidate.id,
          candidateEmail: candidate.email,
          candidateFirstName: candidate.firstName,
          renderedHtml: updated.renderedHtml,
          subject,
          expiryDate: updated.expiryDate,
        });
      }
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
