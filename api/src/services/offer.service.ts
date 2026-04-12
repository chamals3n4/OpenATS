import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { offers, candidates, jobs, templates } from "../db/schema";
import type { Offer } from "../db/schema/offers";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";
import { mailService } from "./mail.service";
import { OfferValidationError } from "./offer-errors";
import logger from "../utils/logger";
import {
  buildOfferFallbackInner,
  wrapCompiledTemplateEmail,
  wrapFallbackEmail,
} from "../utils/email-fallback-layout";

async function buildOfferFallbackEmailHtml(
  offerLike: { candidateId: number; jobId: number } & Record<string, unknown>,
): Promise<string> {
  const context = await variableService.getContextForOffer(
    offerLike.candidateId,
    offerLike,
  );
  const name = context.candidate_name?.trim() || "there";
  const jobTitle = context.job_title?.trim() || "the role";
  const company = context.company_name?.trim() || "the company";
  return wrapFallbackEmail(
    buildOfferFallbackInner({
      candidateName: name,
      jobTitle,
      companyName: company,
    }),
  );
}

/** Sends the rendered offer letter via Resend (see `mail.service.ts`). */
async function sendOfferEmailForOffer(offer: Offer): Promise<void> {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, offer.candidateId));
  if (!candidate) {
    throw new OfferValidationError("Candidate not found for this offer.");
  }

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
  } else {
    const context = await variableService.getContextForOffer(candidate.id, offer);
    subject = templateEngineService.replaceVariables(
      "Offer update — {{job_title}}",
      context,
    );
  }

  const html =
    offer.renderedHtml?.trim() || (await buildOfferFallbackEmailHtml(offer));

  await mailService.sendOfferEmail(candidate.email, subject, html);
}

async function assertOfferTemplateType(templateId: number | null | undefined) {
  if (templateId == null) return;
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId));
  if (!template) {
    throw new OfferValidationError("Template not found.");
  }
  if (template.type !== "offer") {
    throw new OfferValidationError(
      'Only templates of type "offer" can be used for offer letters.',
    );
  }
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
      orderBy: (o, { desc: d }) => [d(o.createdAt)],
    });
  },

  async getByIdWithDetails(id: number) {
    return db.query.offers.findFirst({
      where: eq(offers.id, id),
      with: {
        candidate: {
          with: { currentStage: true },
        },
        job: {
          with: { department: true },
        },
        template: true,
      },
    });
  },

  async getAllByJob(jobId: number) {
    return db.query.offers.findMany({
      where: eq(offers.jobId, jobId),
      with: {
        candidate: {
          with: { currentStage: true },
        },
        job: {
          with: { department: true },
        },
        template: true,
      },
      orderBy: (o, { desc: d }) => [d(o.createdAt)],
    });
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

    if (!candidate) throw new OfferValidationError("Candidate not found");

    if (candidate.jobId !== input.jobId) {
      throw new OfferValidationError(
        "Offer jobId must match the candidate's assigned job.",
      );
    }

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, input.jobId));

    if (!job) throw new OfferValidationError("Job not found");

    await assertOfferTemplateType(input.templateId ?? null);

    let renderedHtml: string | null = null;
    if (input.templateId) {
      renderedHtml = await this._renderOfferHtml(input);
    }
    if (!renderedHtml?.trim()) {
      logger.warn(
        `[offers] create: no rendered letter HTML; using built-in offer notice (candidateId=${input.candidateId})`,
      );
      renderedHtml = await buildOfferFallbackEmailHtml({
        candidateId: input.candidateId,
        jobId: input.jobId,
        templateId: input.templateId ?? null,
        salary: input.salary ?? null,
        currency: input.currency ?? null,
        payFrequency: input.payFrequency ?? null,
        startDate: input.startDate ?? null,
        expiryDate: input.expiryDate ?? null,
        benefitsText: input.benefitsText ?? null,
        status: input.status ?? "draft",
        createdBy: input.createdBy,
      });
    }

    let status = input.status ?? "draft";
    let sentAt: Date | null = null;

    if (status === "sent") {
      if (!renderedHtml?.trim()) {
        logger.warn(
          `[offers] create: requested sent but no letter rendered; saving as draft (candidateId=${input.candidateId})`,
        );
        status = "draft";
      } else {
        sentAt = new Date();
      }
    }

    const [newOffer] = await db
      .insert(offers)
      .values(
        clean({
          ...input,
          status,
          renderedHtml,
          sentAt,
        }),
      )
      .returning();

    if (!newOffer) throw new Error("Failed to create offer");

    if (status === "sent" && newOffer.renderedHtml?.trim()) {
      try {
        await sendOfferEmailForOffer(newOffer);
      } catch (err) {
        await db
          .update(offers)
          .set({
            status: "draft",
            sentAt: null,
            updatedAt: new Date(),
          })
          .where(eq(offers.id, newOffer.id));
        throw err;
      }
    }

    return newOffer;
  },

  async update(id: number, input: UpdateOfferInput) {
    const [existing] = await db.select().from(offers).where(eq(offers.id, id));
    if (!existing) return null;

    if (input.templateId !== undefined && input.templateId !== null) {
      await assertOfferTemplateType(input.templateId);
    }

    if (input.status === "sent" && existing.status !== "sent") {
      throw new OfferValidationError(
        'To send the offer email, use PATCH /offers/:id/status with body {"status":"sent"} — not PUT with status sent.',
      );
    }

    const updatedData: Record<string, unknown> = {
      ...clean(input),
      updatedAt: new Date(),
    };

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

    return updated;
  },

  async delete(id: number) {
    const [deleted] = await db
      .delete(offers)
      .where(eq(offers.id, id))
      .returning();
    return deleted ?? null;
  },

  async updateStatus(
    id: number,
    status: "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn",
  ) {
    const [prev] = await db.select().from(offers).where(eq(offers.id, id));
    if (!prev) return null;

    if (status === "sent") {
      let renderedHtml = prev.renderedHtml;
      if (!renderedHtml?.trim() && prev.templateId) {
        renderedHtml = await this._renderOfferHtml(prev);
      }
      if (!renderedHtml?.trim()) {
        logger.warn(
          `[offers] updateStatus sent: no letter HTML; using built-in notice (offerId=${id})`,
        );
        renderedHtml = await buildOfferFallbackEmailHtml(prev);
      }

      const setPayload: Record<string, unknown> = {
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      };
      if (renderedHtml !== prev.renderedHtml) {
        setPayload.renderedHtml = renderedHtml;
      }

      const [updated] = await db
        .update(offers)
        .set(setPayload as typeof offers.$inferInsert)
        .where(eq(offers.id, id))
        .returning();

      if (!updated) return null;

      try {
        await sendOfferEmailForOffer(updated);
      } catch (err) {
        await db
          .update(offers)
          .set({
            status: prev.status,
            sentAt: prev.sentAt,
            renderedHtml: prev.renderedHtml,
            updatedAt: new Date(),
          })
          .where(eq(offers.id, id));
        throw err;
      }

      return updated;
    }

    const [updated] = await db
      .update(offers)
      .set({ status, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();

    return updated ?? null;
  },

  async _renderOfferHtml(input: {
    templateId?: number | null;
    candidateId: number;
    jobId: number;
    salary?: number | null;
    currency?: string | null;
    payFrequency?: string | null;
    startDate?: string | null;
    expiryDate?: string | null;
    benefitsText?: string | null;
  }): Promise<string | null> {
    if (!input.templateId) return null;

    await assertOfferTemplateType(input.templateId);

    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, input.templateId));

    if (!template) return null;

    const context = await variableService.getContextForOffer(
      input.candidateId,
      input,
    );

    return templateEngineService.renderHTML(template.bodyJson, context);
  },
};
