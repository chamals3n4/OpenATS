import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  candidateStageHistory,
  candidates,
  jobPipelineStages,
  jobs,
  offers,
  templates,
} from "../db/schema";
import { cleanObject as clean } from "../utils/object.utils";
import { variableService } from "./variable.service";
import { templateEngineService } from "./template-engine.service";
import { mailService } from "./mail.service";
import { candidateActivityService } from "./candidate-activity.service";
import { offerRepository } from "./offer.repository";

export type OfferStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired";

export interface CreateOfferInput {
  candidateId: number;
  jobId: number;
  templateId?: number | null | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  employmentType?:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | "freelance"
    | null
    | undefined;
  startDate?: string | null | undefined;
  reportingManager?: string | null | undefined;
  benefits?: string | null | undefined;
  offerLetterHtml?: string | null | undefined;
  status?: OfferStatus | undefined;
  createdBy: number;
}

export interface UpdateOfferInput {
  templateId?: number | null | undefined;
  status?: OfferStatus | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  employmentType?:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | "freelance"
    | null
    | undefined;
  startDate?: string | null | undefined;
  reportingManager?: string | null | undefined;
  benefits?: string | null | undefined;
  offerLetterHtml?: string | null | undefined;
}

function isTransitionAllowed(from: OfferStatus, to: OfferStatus) {
  if (from === to) return true;

  const allowed: Record<OfferStatus, OfferStatus[]> = {
    draft: ["sent", "expired"],
    sent: ["viewed", "accepted", "declined", "expired"],
    viewed: ["accepted", "declined", "expired"],
    accepted: [],
    declined: [],
    expired: [],
  };

  return allowed[from].includes(to);
}

function generateReviewToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeDate(dateInput?: string | null) {
  if (!dateInput) return null;
  return dateInput;
}

async function renderTemplateHtml(
  candidateId: number,
  templateId: number,
  offerData: Partial<typeof offers.$inferSelect>,
) {
  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId));

  if (!template) {
    throw new Error("Template not found");
  }

  const context = await variableService.getContextForOffer(candidateId, {
    ...offerData,
    templateId,
  });

  return templateEngineService.renderHTML(template.bodyJson, context);
}

async function getOfferWithContext(offerId: number) {
  const [row] = await db
    .select({
      offer: offers,
      candidate: {
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
      },
      job: {
        id: jobs.id,
        title: jobs.title,
      },
    })
    .from(offers)
    .innerJoin(candidates, eq(offers.candidateId, candidates.id))
    .innerJoin(jobs, eq(offers.jobId, jobs.id))
    .where(eq(offers.id, offerId));

  return row ?? null;
}

function validateSendRequirements(
  offer: typeof offers.$inferSelect,
  offerLetterHtml: string | null,
) {
  const requiredMissing: string[] = [];

  if (!offer.salary) requiredMissing.push("salary");
  if (!offer.currency) requiredMissing.push("currency");
  if (!offer.employmentType) requiredMissing.push("employmentType");
  if (!offer.startDate) requiredMissing.push("startDate");
  if (!offer.reportingManager) requiredMissing.push("reportingManager");
  if (!offer.benefits) requiredMissing.push("benefits");
  if (!offerLetterHtml) requiredMissing.push("offerLetterHtml");

  if (requiredMissing.length > 0) {
    throw new Error(
      `Cannot send offer. Missing required fields: ${requiredMissing.join(", ")}`,
    );
  }
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
      orderBy: [desc(offers.createdAt)],
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
    return db.query.offers.findFirst({
      where: eq(offers.id, id),
      with: {
        candidate: true,
        job: true,
        template: true,
      },
    });
  },

  async getByCandidateAndJob(candidateId: number, jobId: number) {
    return offerRepository.findByCandidateAndJob(candidateId, jobId);
  },

  async ensureDraftForCandidateInOfferStage(
    candidateId: number,
    jobId: number,
    createdBy: number,
  ) {
    const existing = await offerRepository.findByCandidateAndJob(
      candidateId,
      jobId,
    );

    if (existing) return existing;

    const created = await offerRepository.create({
      candidateId,
      jobId,
      status: "draft",
      createdBy,
    });

    if (!created) throw new Error("Failed to auto-create draft offer");

    await candidateActivityService.create({
      candidateId,
      jobId,
      offerId: created.id,
      actorId: createdBy,
      eventType: "offer_created",
    });

    return created;
  },

  async create(input: CreateOfferInput) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, input.candidateId));

    if (!candidate) throw new Error("Candidate not found");

    const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId));

    if (!job) throw new Error("Job not found");

    const existing = await offerRepository.findByCandidateAndJob(
      input.candidateId,
      input.jobId,
    );

    if (existing) {
      return existing;
    }

    let offerLetterHtml = input.offerLetterHtml ?? null;
    if (!offerLetterHtml && input.templateId) {
      offerLetterHtml = await renderTemplateHtml(
        input.candidateId,
        input.templateId,
        {
          ...input,
        },
      );
    }

    const [newOffer] = await db
      .insert(offers)
      .values(
        clean({
          candidateId: input.candidateId,
          jobId: input.jobId,
          templateId: input.templateId ?? null,
          status: input.status ?? "draft",
          salary: input.salary ?? null,
          currency: input.currency ?? null,
          employmentType: input.employmentType ?? null,
          startDate: normalizeDate(input.startDate),
          reportingManager: input.reportingManager ?? null,
          benefits: input.benefits ?? null,
          offerLetterHtml,
          createdBy: input.createdBy,
        }),
      )
      .returning();

    if (!newOffer) throw new Error("Failed to create offer");

    await candidateActivityService.create({
      candidateId: newOffer.candidateId,
      jobId: newOffer.jobId,
      offerId: newOffer.id,
      actorId: input.createdBy,
      eventType: "offer_created",
    });

    return newOffer;
  },

  async update(id: number, input: UpdateOfferInput, actorId?: number | null) {
    const existing = await offerRepository.findById(id);
    if (!existing) return null;

    if (input.status && !isTransitionAllowed(existing.status, input.status)) {
      throw new Error(
        `Invalid offer status transition: ${existing.status} -> ${input.status}`,
      );
    }

    let offerLetterHtml = input.offerLetterHtml;
    if (
      input.templateId !== undefined &&
      !input.offerLetterHtml &&
      input.templateId
    ) {
      offerLetterHtml = await renderTemplateHtml(
        existing.candidateId,
        input.templateId,
        {
          ...existing,
          ...input,
        },
      );
    }

    const updated = await offerRepository.updateById(
      id,
      clean({
        templateId: input.templateId,
        status: input.status,
        salary: input.salary,
        currency: input.currency,
        employmentType: input.employmentType,
        startDate: normalizeDate(input.startDate),
        reportingManager: input.reportingManager,
        benefits: input.benefits,
        offerLetterHtml,
      }),
    );

    if (!updated) return null;

    await candidateActivityService.create({
      candidateId: updated.candidateId,
      jobId: updated.jobId,
      offerId: updated.id,
      actorId: actorId ?? null,
      eventType: "offer_updated",
    });

    return updated;
  },

  async send(id: number, actorId: number) {
    const offerData = await getOfferWithContext(id);
    if (!offerData) return null;

    const { offer, candidate, job } = offerData;

    if (
      offer.status === "accepted" ||
      offer.status === "declined" ||
      offer.status === "expired"
    ) {
      throw new Error(`Cannot send an offer in status '${offer.status}'`);
    }

    let offerLetterHtml = offer.offerLetterHtml;
    // Always re-render from template if available to ensure variables are replaced
    if (offer.templateId) {
      offerLetterHtml = await renderTemplateHtml(
        offer.candidateId,
        offer.templateId,
        offer,
      );
    }

    validateSendRequirements(offer, offerLetterHtml);

    const reviewToken = offer.reviewToken ?? generateReviewToken();
    const frontendBase = (
      process.env.FRONTEND_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");
    const reviewUrl = `${frontendBase}/offer/${reviewToken}`;

    const subject = `Offer for ${job.title}`;
    const mailHtml = [
      `<p>Hello ${candidate.firstName} ${candidate.lastName},</p>`,
      "<p>Congratulations and welcome to the next step.</p>",
      `<p>Please review your offer using this secure link: <a href=\"${reviewUrl}\">${reviewUrl}</a></p>`,
      "<p>You can accept or decline directly from the page.</p>",
      "<hr />",
      "<p>OpenATS Hiring Team</p>",
    ].join("\n");

    const updated = await offerRepository.updateById(id, {
      status: "sent",
      sentAt: new Date(),
      reviewToken,
      offerLetterHtml,
    });

    if (!updated) {
      throw new Error("Failed to update offer before sending");
    }

    await mailService.sendOfferEmail(candidate.email, subject, mailHtml);

    await candidateActivityService.create({
      candidateId: updated.candidateId,
      jobId: updated.jobId,
      offerId: updated.id,
      actorId,
      eventType: "offer_sent",
      metadata: { reviewUrl },
    });

    return updated;
  },

  async acceptById(id: number, actorId?: number | null) {
    const existing = await offerRepository.findById(id);
    if (!existing) return null;

    if (!["sent", "viewed"].includes(existing.status)) {
      throw new Error(`Cannot accept offer in status '${existing.status}'`);
    }

    const updated = await offerRepository.updateById(id, {
      status: "accepted",
      acceptedAt: new Date(),
    });

    if (!updated) return null;

    await candidateActivityService.create({
      candidateId: updated.candidateId,
      jobId: updated.jobId,
      offerId: updated.id,
      actorId: actorId ?? null,
      eventType: "offer_accepted",
    });

    return updated;
  },

  async declineById(id: number, actorId?: number | null) {
    const existing = await offerRepository.findById(id);
    if (!existing) return null;

    if (!["sent", "viewed"].includes(existing.status)) {
      throw new Error(`Cannot decline offer in status '${existing.status}'`);
    }

    const updated = await offerRepository.updateById(id, {
      status: "declined",
      declinedAt: new Date(),
    });

    if (!updated) return null;

    await candidateActivityService.create({
      candidateId: updated.candidateId,
      jobId: updated.jobId,
      offerId: updated.id,
      actorId: actorId ?? null,
      eventType: "offer_declined",
    });

    return updated;
  },

  async getPublicByToken(token: string) {
    const [row] = await db
      .select({
        offer: offers,
        candidate: {
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
        },
        job: {
          title: jobs.title,
        },
      })
      .from(offers)
      .innerJoin(candidates, eq(offers.candidateId, candidates.id))
      .innerJoin(jobs, eq(offers.jobId, jobs.id))
      .where(eq(offers.reviewToken, token));

    if (!row) return null;

    if (row.offer.status === "sent") {
      const updated = await offerRepository.updateById(row.offer.id, {
        status: "viewed",
        viewedAt: new Date(),
      });

      if (updated) {
        row.offer.status = updated.status;
        row.offer.viewedAt = updated.viewedAt;

        await candidateActivityService.create({
          candidateId: updated.candidateId,
          jobId: updated.jobId,
          offerId: updated.id,
          eventType: "offer_viewed",
        });
      }
    }

    return {
      id: row.offer.id,
      status: row.offer.status,
      salary: row.offer.salary,
      currency: row.offer.currency,
      employmentType: row.offer.employmentType,
      startDate: row.offer.startDate,
      reportingManager: row.offer.reportingManager,
      benefits: row.offer.benefits,
      offerLetterHtml: row.offer.offerLetterHtml,
      sentAt: row.offer.sentAt,
      viewedAt: row.offer.viewedAt,
      acceptedAt: row.offer.acceptedAt,
      declinedAt: row.offer.declinedAt,
      candidateName: `${row.candidate.firstName} ${row.candidate.lastName}`,
      candidateEmail: row.candidate.email,
      jobTitle: row.job.title,
    };
  },

  async acceptByToken(token: string) {
    const offer = await offerRepository.findByReviewToken(token);
    if (!offer) return null;

    return this.acceptById(offer.id, null);
  },

  async declineByToken(token: string) {
    const offer = await offerRepository.findByReviewToken(token);
    if (!offer) return null;

    return this.declineById(offer.id, null);
  },

  async markAsHired(id: number, actorId: number) {
    const offer = await offerRepository.findById(id);
    if (!offer) return null;

    if (offer.status !== "accepted") {
      throw new Error("Only accepted offers can be marked as hired");
    }

    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, offer.candidateId));

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    const [hiredStage] = await db
      .select()
      .from(jobPipelineStages)
      .where(
        and(
          eq(jobPipelineStages.jobId, offer.jobId),
          eq(jobPipelineStages.stageType, "offer"),
        ),
      )
      .orderBy(jobPipelineStages.position);

    if (!hiredStage) {
      throw new Error("No Offer-type stage found for this job");
    }

    const allOfferStages = await db
      .select()
      .from(jobPipelineStages)
      .where(
        and(
          eq(jobPipelineStages.jobId, offer.jobId),
          eq(jobPipelineStages.stageType, "offer"),
        ),
      )
      .orderBy(jobPipelineStages.position);

    const namedHiredStage = allOfferStages.find(
      (stage) => stage.name.trim().toLowerCase() === "hired",
    );

    const targetStage =
      namedHiredStage ??
      allOfferStages[allOfferStages.length - 1] ??
      hiredStage;

    const [updatedCandidate] = await db
      .update(candidates)
      .set({
        currentStageId: targetStage.id,
        status: "hired",
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidate.id))
      .returning();

    if (!updatedCandidate) {
      throw new Error("Failed to mark candidate as hired");
    }

    await db.insert(candidateStageHistory).values({
      candidateId: candidate.id,
      stageId: targetStage.id,
      movedBy: actorId,
    });

    await candidateActivityService.create({
      candidateId: candidate.id,
      jobId: candidate.jobId,
      offerId: offer.id,
      stageId: targetStage.id,
      actorId,
      eventType: "candidate_hired",
    });

    return {
      candidate: updatedCandidate,
      hiredStage: targetStage,
    };
  },
};
