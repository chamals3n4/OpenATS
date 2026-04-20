import { randomUUID } from "crypto";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { offers, candidates, jobs, templates, users, emailMessages } from "../db/schema";
import type { Offer } from "../db/schema/offers";
import { variableService } from "./variable.service";
import { templateService } from "./template.service";
import { templateEngineService } from "./template-engine.service";
import { cleanObject as clean } from "../utils/object.utils";
import { mailService } from "./mail.service";
import logger from "../utils/logger";
import {
  buildOfferFallbackInner,
  buildOfferResponseButtons,
  buildOfferWithdrawalInner,
  buildOfferResponseNotificationInner,
  wrapFallbackEmail,
} from "../utils/email-fallback-layout";
import { isPastOfferResponseDeadline } from "../utils/offer-expiry";

/** Thrown for client-fixable offer rules; maps to HTTP 400 in controllers. */
export class OfferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfferValidationError";
  }
}

/**
 * Accept/decline (sent or pending offers with an expiry date) only while the
 * response window is open — same rule as the public email link.
 */
function assertOfferResponsePeriodOpen(
  prev: Offer,
  nextStatus: Offer["status"],
): void {
  if (nextStatus !== "accepted" && nextStatus !== "declined") return;
  if (prev.status !== "sent" && prev.status !== "pending") return;
  if (!prev.expiryDate) return;
  if (isPastOfferResponseDeadline(prev.expiryDate)) {
    throw new OfferValidationError(
      "The response period for this offer has ended; it can no longer be accepted or declined.",
    );
  }
}

export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** When no template is chosen on the stage / API body, use the default `offer` template if one exists. */
async function resolveOfferTemplateId(
  explicit: number | null | undefined,
): Promise<number | null> {
  if (
    explicit != null &&
    typeof explicit === "number" &&
    Number.isFinite(explicit) &&
    explicit > 0
  ) {
    return Math.trunc(explicit);
  }
  return templateService.getDefaultTemplateIdForType("offer");
}

async function buildOfferFallbackEmailHtml(
  offerLike: { candidateId: number; jobId: number } & Record<string, unknown>,
  responseToken?: string | null,
): Promise<string> {
  const context = await variableService.getContextForOffer(
    offerLike.candidateId,
    offerLike,
  );
  const name = context.candidate_name?.trim() || "there";
  const jobTitle = context.job_title?.trim() || "the role";
  const company = context.company_name?.trim() || "the company";
  const inner = buildOfferFallbackInner({
    candidateName: name,
    jobTitle,
    companyName: company,
    salary: context.salary as string | number | null | undefined,
    currency: context.currency as string | null | undefined,
    payFrequency: context.pay_frequency as string | null | undefined,
    startDate: context.start_date as string | null | undefined,
    expiryDate: context.expiry_date as string | null | undefined,
    benefits: context.benefits as string | null | undefined,
  });
  const responseSection = responseToken
    ? buildOfferResponseButtons(
        `${process.env.APP_URL}/offer/respond?token=${responseToken}&action=accept`,
        `${process.env.APP_URL}/offer/respond?token=${responseToken}&action=decline`,
      )
    : "";
  return wrapFallbackEmail(inner + responseSection);
}

/** True when the letter already contains tokenized accept/decline links (avoid duplicate CTAs). */
function offerHtmlHasRespondLinks(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("/offer/respond") ||
    lower.includes("offer%2frespond") ||
    lower.includes("action=accept") ||
    lower.includes("action=decline") ||
    lower.includes("action%3daccept") ||
    lower.includes("action%3ddecline")
  );
}

/** Appends the canonical accept/decline controls after the letter body. */
function appendResponseButtons(html: string, responseToken: string): string {
  const appUrl = process.env.APP_URL ?? "";
  if (!appUrl) return html;
  const buttons = buildOfferResponseButtons(
    `${appUrl}/offer/respond?token=${responseToken}&action=accept`,
    `${appUrl}/offer/respond?token=${responseToken}&action=decline`,
  );
  return `${html.trimEnd()}${buttons}`;
}

/** Sends the rendered offer letter via Resend (see `mail.service.ts`). */
async function sendOfferEmailForOffer(
  offer: Offer,
  executor: DbExecutor = db,
): Promise<void> {
  // `create({ status: "sent" }, tx)` used to skip the token — links in the email were dead.
  // Issue a token on send (same executor as the outer transaction when applicable).
  let token = offer.responseToken?.trim() || null;
  if (!token) {
    token = randomUUID().replace(/-/g, "");
    await executor
      .update(offers)
      .set({ responseToken: token, updatedAt: new Date() })
      .where(eq(offers.id, offer.id));
  }
  const emailOffer: Offer = { ...offer, responseToken: token };

  const [candidate] = await executor
    .select()
    .from(candidates)
    .where(eq(candidates.id, offer.candidateId));
  if (!candidate) {
    throw new OfferValidationError("Candidate not found for this offer.");
  }

  let subject = "Offer Letter";
  if (emailOffer.templateId) {
    const [template] = await executor
      .select()
      .from(templates)
      .where(eq(templates.id, emailOffer.templateId));
    if (template) {
      const context = await variableService.getContextForOffer(
        candidate.id,
        emailOffer,
      );
      subject = templateEngineService.replaceVariables(template.subject, context);
    }
  } else {
    const context = await variableService.getContextForOffer(
      candidate.id,
      emailOffer,
    );
    subject = templateEngineService.replaceVariables(
      "Offer update — {{job_title}}",
      context,
    );
  }

  let html: string;
  if (emailOffer.templateId != null) {
    const fresh = await offerService._renderOfferHtml(emailOffer);
    html =
      fresh?.trim() ||
      emailOffer.renderedHtml?.trim() ||
      (await buildOfferFallbackEmailHtml(emailOffer, emailOffer.responseToken));
  } else {
    html =
      emailOffer.renderedHtml?.trim() ||
      (await buildOfferFallbackEmailHtml(emailOffer, emailOffer.responseToken));
  }

  // Template path: append one official accept/decline row unless the template already embeds respond links.
  if (
    emailOffer.renderedHtml?.trim() &&
    emailOffer.responseToken &&
    !offerHtmlHasRespondLinks(html)
  ) {
    html = appendResponseButtons(html, emailOffer.responseToken);
  }

  await mailService.sendOfferEmail(candidate.email, subject, html);

  // record it so the recruiter can see what went out
  try {
    await executor.insert(emailMessages).values({
      candidateId: emailOffer.candidateId,
      sentBy: emailOffer.createdBy,
      templateId: emailOffer.templateId ?? null,
      subject: subject.slice(0, 500),
      bodyHtml: html,
      recipientEmail: candidate.email,
    });
  } catch (logErr) {
    logger.warn("[offers] failed to log offer email in email_messages", logErr);
  }
}

/** Emails the candidate when their offer is withdrawn. */
async function sendWithdrawalEmailForOffer(offer: Offer): Promise<void> {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, offer.candidateId));
  if (!candidate) return;

  const context = await variableService.getContextForOffer(
    candidate.id,
    offer,
  );

  const withdrawalTemplateId =
    await templateService.getDefaultTemplateIdForType("offer_withdrawal");
  const [withdrawalTemplate] = withdrawalTemplateId
    ? await db
        .select()
        .from(templates)
        .where(eq(templates.id, withdrawalTemplateId))
        .limit(1)
    : [];

  let subject: string;
  let html: string;

  if (withdrawalTemplate) {
    const compiled = templateEngineService.compileTemplate(
      withdrawalTemplate.subject,
      withdrawalTemplate.bodyJson,
      context,
    );
    subject = compiled.subject;
    html = compiled.html;
  } else {
    const candidateName = context.candidate_name?.trim() || "there";
    const jobTitle = context.job_title?.trim() || "the role";
    const companyName = context.company_name?.trim() || "the company";
    subject = templateEngineService.replaceVariables(
      "Update on your offer — {{job_title}}",
      context,
    );
    html = wrapFallbackEmail(
      buildOfferWithdrawalInner({ candidateName, jobTitle, companyName }),
    );
  }

  try {
    await mailService.sendEmail({ to: candidate.email, subject, html });
    // record it alongside the other sent emails
    await db.insert(emailMessages).values({
      candidateId: offer.candidateId,
      sentBy: offer.createdBy,
      templateId: withdrawalTemplate?.id ?? null,
      subject: subject.slice(0, 500),
      bodyHtml: html,
      recipientEmail: candidate.email,
    });
  } catch (err) {
    logger.warn("[offers] withdrawal email failed (non-fatal)", err);
  }
}

/** Pings the person who sent the offer when the candidate responds via email link. */
export async function sendOfferResponseNotification(
  offer: Offer,
  action: "accepted" | "declined",
): Promise<void> {
  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, offer.createdBy));
  if (!creator?.email) return;

  const context = await variableService.getContextForOffer(
    offer.candidateId,
    offer,
  );
  const candidateName = context.candidate_name?.trim() || "the candidate";
  const jobTitle = context.job_title?.trim() || "the role";

  const verb = action === "accepted" ? "accepted" : "declined";
  const subject = `${candidateName} has ${verb} the offer — ${jobTitle}`;
  const html = wrapFallbackEmail(
    buildOfferResponseNotificationInner({ candidateName, jobTitle, action }),
  );

    try {
      await mailService.sendEmail({ to: creator.email, subject, html });
    } catch (err) {
      logger.warn("[offers] response notification email failed (non-fatal)", err);
    }
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
  payFrequency?:
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | null
    | undefined;
  startDate?: string | null | undefined;
  expiryDate?: string | null | undefined;
  benefits?: string | null | undefined;
  status?:
    | "draft"
    | "sent"
    | "pending"
    | "accepted"
    | "declined"
    | "withdrawn"
    | undefined;
  createdBy: number;
}

export interface UpdateOfferInput {
  templateId?: number | null | undefined;
  status?:
    | "draft"
    | "sent"
    | "pending"
    | "accepted"
    | "declined"
    | "withdrawn"
    | undefined;
  salary?: number | null | undefined;
  currency?: string | null | undefined;
  payFrequency?:
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | null
    | undefined;
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

  async create(input: CreateOfferInput, executor: DbExecutor = db) {
    const [candidate] = await executor
      .select()
      .from(candidates)
      .where(eq(candidates.id, input.candidateId));

    if (!candidate) throw new OfferValidationError("Candidate not found");

    if (candidate.jobId !== input.jobId) {
      throw new OfferValidationError(
        "Offer jobId must match the candidate's assigned job.",
      );
    }

    const [job] = await executor
      .select()
      .from(jobs)
      .where(eq(jobs.id, input.jobId));

    if (!job) throw new OfferValidationError("Job not found");

    const templateId = await resolveOfferTemplateId(input.templateId);

    await assertOfferTemplateType(templateId);

    const inputResolved = { ...input, templateId };

    let renderedHtml: string | null = null;
    if (templateId) {
      renderedHtml = await this._renderOfferHtml(inputResolved);
    }
    if (!renderedHtml?.trim()) {
      logger.warn(
        `[offers] create: no rendered letter HTML; using built-in offer notice (candidateId=${input.candidateId})`,
      );
      renderedHtml = await buildOfferFallbackEmailHtml({
        candidateId: input.candidateId,
        jobId: input.jobId,
        templateId,
        salary: input.salary ?? null,
        currency: input.currency ?? null,
        payFrequency: input.payFrequency ?? null,
        startDate: input.startDate ?? null,
        expiryDate: input.expiryDate ?? null,
        benefits: input.benefits ?? null,
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

    const [newOffer] = await executor
      .insert(offers)
      .values(
        clean({
          ...input,
          templateId,
          status,
          renderedHtml,
          sentAt,
        }),
      )
      .returning();

    if (!newOffer) throw new Error("Failed to create offer");

    if (status === "sent" && newOffer.renderedHtml?.trim()) {
      try {
        await sendOfferEmailForOffer(newOffer, executor);
      } catch (err) {
        await executor
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

    if (input.status === "accepted" || input.status === "declined") {
      assertOfferResponsePeriodOpen(existing, input.status);
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
      input.benefits !== undefined;

    if (merged.templateId && (affectsOfferLetter || !existing.renderedHtml)) {
      updatedData.renderedHtml = await this._renderOfferHtml(merged);
    } else if (!merged.templateId && affectsOfferLetter) {
      updatedData.renderedHtml = await buildOfferFallbackEmailHtml(merged);
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

  /**
   * Marks sent/pending offers as withdrawn once the response deadline has passed
   * (same cutoff as the public accept/decline link). Sends the usual withdrawal email.
   */
  async withdrawExpiredOffers(): Promise<number> {
    const rows = await db
      .select({ id: offers.id, expiryDate: offers.expiryDate })
      .from(offers)
      .where(
        and(
          inArray(offers.status, ["sent", "pending"]),
          isNotNull(offers.expiryDate),
        ),
      );

    let count = 0;
    for (const row of rows) {
      if (!isPastOfferResponseDeadline(row.expiryDate)) continue;
      await this.updateStatus(row.id, "withdrawn");
      count++;
    }
    return count;
  },

  async updateStatus(
    id: number,
    status:
      | "draft"
      | "sent"
      | "pending"
      | "accepted"
      | "declined"
      | "withdrawn",
  ) {
    const [prev] = await db.select().from(offers).where(eq(offers.id, id));
    if (!prev) return null;

    assertOfferResponsePeriodOpen(prev, status);

    if (status === "sent") {
      // Generate a unique token for self-serve accept / decline links
      const responseToken = prev.responseToken ?? randomUUID().replace(/-/g, "");

      const templateId = await resolveOfferTemplateId(prev.templateId);
      const offerForRender = { ...prev, templateId };

      let renderedHtml = prev.renderedHtml;
      if (templateId) {
        const fresh = await this._renderOfferHtml(offerForRender);
        if (fresh?.trim()) renderedHtml = fresh;
      } else {
        renderedHtml = await buildOfferFallbackEmailHtml(prev, responseToken);
      }
      if (!renderedHtml?.trim()) {
        logger.warn(
          `[offers] updateStatus sent: no letter HTML; using built-in notice (offerId=${id})`,
        );
        renderedHtml = await buildOfferFallbackEmailHtml(prev, responseToken);
      }

      const setPayload: Record<string, unknown> = {
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
        responseToken,
      };
      if (renderedHtml !== prev.renderedHtml) {
        setPayload.renderedHtml = renderedHtml;
      }
      if ((templateId ?? null) !== (prev.templateId ?? null)) {
        setPayload.templateId = templateId;
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
            responseToken: prev.responseToken,
            templateId: prev.templateId,
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

    if (!updated) return null;

    // Send withdrawal email to candidate when company withdraws
    if (status === "withdrawn") {
      void sendWithdrawalEmailForOffer(updated);
    }

    return updated;
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
    benefits?: string | null;
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

    const [jobRow] = await db
      .select({ description: jobs.description })
      .from(jobs)
      .where(eq(jobs.id, input.jobId))
      .limit(1);

    return templateEngineService.renderOfferEmailBodyHTML(
      template.bodyJson,
      context,
      { jobDescriptionHtml: jobRow?.description ?? null },
    );
  },
};
