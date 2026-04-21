import crypto from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  candidates,
  candidateStageHistory,
  jobHiringTeam,
  jobPipelineStages,
  jobs,
  offers,
  offerResponseAttempts,
  users,
} from "../db/schema";
import { mailService } from "./mail.service";
import { socketService } from "./socket.service";

type OfferDecision = "accepted" | "declined";

function resolveOfferExpiresAt(
  offerExpiryDate: string | null,
  fallbackDate: Date,
): Date {
  if (!offerExpiryDate) return fallbackDate;
  const parsed = new Date(offerExpiryDate);
  if (Number.isNaN(parsed.getTime())) return fallbackDate;
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

async function resolveOfferDecisionStageId(
  candidateId: number,
  status: OfferDecision,
): Promise<number | null> {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate) return null;

  const stages = await db
    .select()
    .from(jobPipelineStages)
    .where(eq(jobPipelineStages.jobId, candidate.jobId))
    .orderBy(asc(jobPipelineStages.position));

  if (!stages.length) return null;
  const current = stages.find((s) => s.id === candidate.currentStageId) ?? null;

  if (status === "declined") {
    const rejection = stages.find((s) => s.stageType === "rejection");
    return rejection?.id ?? current?.id ?? null;
  }

  // For accepted offers, never auto-route to a rejection stage.
  // Prefer moving forward from the offer stage (or latest offer-stage history)
  // rather than blindly from current stage, because current stage may already
  // be rejection due to prior manual/automated transitions.
  let referencePosition: number | null = null;

  if (current?.stageType === "offer") {
    referencePosition = current.position;
  } else {
    const [latestOfferStage] = await db
      .select({
        stageId: candidateStageHistory.stageId,
        position: jobPipelineStages.position,
      })
      .from(candidateStageHistory)
      .innerJoin(
        jobPipelineStages,
        eq(candidateStageHistory.stageId, jobPipelineStages.id),
      )
      .where(
        and(
          eq(candidateStageHistory.candidateId, candidateId),
          eq(jobPipelineStages.jobId, candidate.jobId),
          eq(jobPipelineStages.stageType, "offer"),
        ),
      )
      .orderBy(desc(candidateStageHistory.movedAt))
      .limit(1);

    referencePosition = latestOfferStage?.position ?? current?.position ?? null;
  }

  if (referencePosition == null) return current?.id ?? null;

  const nextNonRejection = stages.find(
    (s) => s.position > referencePosition && s.stageType !== "rejection",
  );
  return nextNonRejection?.id ?? current?.id ?? null;
}

async function notifyHiringTeamAboutOfferDecision(input: {
  offerId: number;
  candidateId: number;
  jobId: number;
  decision: OfferDecision;
  candidateName: string;
  candidateMessage?: string | null;
}) {
  const recipients = await db
    .select({
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(jobHiringTeam)
    .innerJoin(users, eq(jobHiringTeam.userId, users.id))
    .where(eq(jobHiringTeam.jobId, input.jobId));

  const subject = `Offer ${input.decision}: ${input.candidateName}`;
  const candidateMsgBlock = input.candidateMessage?.trim()
    ? `<p><strong>Candidate message:</strong> ${input.candidateMessage.trim()}</p>`
    : "";

  await Promise.all(
    recipients.map((recipient) =>
      mailService.sendEmail({
        to: recipient.email,
        subject,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h3>Hello ${recipient.firstName} ${recipient.lastName},</h3>
            <p>${input.candidateName} has <strong>${input.decision}</strong> the offer.</p>
            <p><strong>Offer ID:</strong> #${input.offerId}</p>
            ${candidateMsgBlock}
            <p>This is an automated message from OpenATS.</p>
          </div>
        `,
      }),
    ),
  );

  // await socketService.sendSystemMessageToJob(
  //   input.jobId,
  //   `${input.candidateName} has ${input.decision} offer #${input.offerId}.`,
  // );
}

export const offerResponseService = {
  async getLatestAttemptByOfferId(offerId: number) {
    const [attempt] = await db
      .select({
        id: offerResponseAttempts.id,
        token: offerResponseAttempts.token,
        status: offerResponseAttempts.status,
        expiresAt: offerResponseAttempts.expiresAt,
        isActive: offerResponseAttempts.isActive,
      })
      .from(offerResponseAttempts)
      .where(eq(offerResponseAttempts.offerId, offerId))
      .orderBy(desc(offerResponseAttempts.createdAt))
      .limit(1);

    return attempt ?? null;
  },

  async createOrRefreshForOffer(input: {
    offerId: number;
    candidateId: number;
    candidateEmail: string;
    candidateFirstName: string;
    renderedHtml: string;
    subject: string;
    expiryDate: string | null;
  }) {
    const now = new Date();
    const fallbackExpiry = new Date();
    fallbackExpiry.setDate(fallbackExpiry.getDate() + 7);
    const expiresAt = resolveOfferExpiresAt(input.expiryDate, fallbackExpiry);

    const [existing] = await db
      .select()
      .from(offerResponseAttempts)
      .where(
        and(
          eq(offerResponseAttempts.offerId, input.offerId),
          eq(offerResponseAttempts.isActive, true),
        ),
      )
      .limit(1);

    const token = existing?.token ?? crypto.randomBytes(32).toString("hex");

    const [attempt] = existing
      ? await db
          .update(offerResponseAttempts)
          .set({
            token,
            status: "pending",
            respondedAt: null,
            responderName: null,
            candidateMessage: null,
            reminder48hSentAt: null,
            reminder24hSentAt: null,
            expiryNotifiedAt: null,
            isActive: true,
            expiresAt,
            updatedAt: now,
          })
          .where(eq(offerResponseAttempts.id, existing.id))
          .returning()
      : await db
          .insert(offerResponseAttempts)
          .values({
            offerId: input.offerId,
            candidateId: input.candidateId,
            token,
            expiresAt,
            status: "pending",
            isActive: true,
          })
          .returning();

    if (!attempt) return null;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const reviewUrl = `${frontendUrl}/offer/${token}`;
    const ctaColor = process.env.EMAIL_THEME_COLOR || "#c97a57";
    const reviewCtaHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; margin-top: 24px;">
        <div style="border-top: 1px solid #e5e7eb; padding-top: 14px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #4b5563;">
            Please review and submit your response before ${new Date(attempt.expiresAt).toLocaleDateString()}.
          </p>
          <div style="margin: 0 0 8px 0;">
            <a href="${reviewUrl}" style="background-color: ${ctaColor}; color: #ffffff; padding: 9px 14px; text-decoration: none; border-radius: 999px; display: inline-block; font-weight: 600; font-size: 13px;">
              Review Offer
            </a>
          </div>
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            If the button doesn't work, use this link: <a href="${reviewUrl}">${reviewUrl}</a>
          </p>
        </div>
      </div>
    `;
    const html = input.renderedHtml
      ? `${input.renderedHtml}${reviewCtaHtml}`
      : `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <p>Hello ${input.candidateFirstName},</p>
            ${reviewCtaHtml}
          </div>
        `;

    await mailService.sendOfferEmail(input.candidateEmail, input.subject, html);
    return attempt;
  },

  async getByToken(token: string) {
    const [attempt] = await db
      .select({
        id: offerResponseAttempts.id,
        token: offerResponseAttempts.token,
        status: offerResponseAttempts.status,
        expiresAt: offerResponseAttempts.expiresAt,
        respondedAt: offerResponseAttempts.respondedAt,
        offer: {
          id: offers.id,
          status: offers.status,
          renderedHtml: offers.renderedHtml,
          expiryDate: offers.expiryDate,
          jobId: offers.jobId,
          jobTitle: jobs.title,
        },
        candidate: {
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
        },
      })
      .from(offerResponseAttempts)
      .innerJoin(offers, eq(offerResponseAttempts.offerId, offers.id))
      .innerJoin(jobs, eq(offers.jobId, jobs.id))
      .innerJoin(
        candidates,
        eq(offerResponseAttempts.candidateId, candidates.id),
      )
      .where(
        and(
          eq(offerResponseAttempts.token, token),
          eq(offerResponseAttempts.isActive, true),
        ),
      )
      .limit(1);
    return attempt ?? null;
  },

  async respondToOffer(
    token: string,
    input: {
      decision: OfferDecision;
      responderName?: string;
      message?: string;
    },
  ) {
    const attempt = await this.getByToken(token);
    if (!attempt) throw new Error("Offer response link is invalid");
    if (attempt.expiresAt < new Date()) {
      throw new Error("Offer response link has expired");
    }
    if (attempt.status !== "pending") {
      throw new Error("This offer was already responded to");
    }

    return db.transaction(async (tx) => {
      const now = new Date();
      const offerStatus =
        input.decision === "accepted" ? "accepted" : "declined";

      const finalResponderName =
        input.responderName?.trim() ||
        `${attempt.candidate.firstName} ${attempt.candidate.lastName}`.trim();

      const [updatedAttempt] = await tx
        .update(offerResponseAttempts)
        .set({
          status: input.decision,
          respondedAt: now,
          responderName: finalResponderName,
          candidateMessage: input.message?.trim() || null,
          isActive: false,
          updatedAt: now,
        })
        .where(eq(offerResponseAttempts.id, attempt.id))
        .returning();

      const [updatedOffer] = await tx
        .update(offers)
        .set({
          status: offerStatus,
          updatedAt: now,
        })
        .where(eq(offers.id, attempt.offer.id))
        .returning();

      if (!updatedAttempt || !updatedOffer) {
        throw new Error("Failed to update offer response");
      }

      const nextStageId = await resolveOfferDecisionStageId(
        attempt.candidate.id,
        input.decision,
      );
      if (nextStageId) {
        await tx
          .update(candidates)
          .set({
            currentStageId: nextStageId,
            updatedAt: now,
          })
          .where(eq(candidates.id, attempt.candidate.id));

        await tx.insert(candidateStageHistory).values({
          candidateId: attempt.candidate.id,
          stageId: nextStageId,
          movedBy: null,
        });
      }

      const candidateName =
        `${attempt.candidate.firstName} ${attempt.candidate.lastName}`.trim();
      await notifyHiringTeamAboutOfferDecision({
        offerId: attempt.offer.id,
        candidateId: attempt.candidate.id,
        jobId: updatedOffer.jobId,
        decision: input.decision,
        candidateName,
        candidateMessage: input.message,
      });

      return updatedOffer;
    });
  },

  async respondManuallyByOfferId(
    offerId: number,
    input: {
      decision: OfferDecision | "withdrawn";
      responderName?: string;
      message?: string;
    },
  ) {
    const attempt = await this.getLatestAttemptByOfferId(offerId);
    if (!attempt) {
      throw new Error("No active offer response flow found for this offer");
    }

    const now = new Date();
    const withinAcceptancePeriod =
      attempt.isActive &&
      attempt.status === "pending" &&
      attempt.expiresAt > now;

    if (input.decision === "withdrawn") {
      if (!withinAcceptancePeriod) {
        throw new Error(
          "Offer can be withdrawn only during the acceptance period",
        );
      }

      return db.transaction(async (tx) => {
        await tx
          .update(offerResponseAttempts)
          .set({
            status: "withdrawn",
            isActive: false,
            respondedAt: now,
            responderName: input.responderName?.trim() || "Recruiter",
            candidateMessage: input.message?.trim() || null,
            updatedAt: now,
          })
          .where(eq(offerResponseAttempts.id, attempt.id));

        const [updatedOffer] = await tx
          .update(offers)
          .set({
            status: "withdrawn",
            updatedAt: now,
          })
          .where(eq(offers.id, offerId))
          .returning();

        if (!updatedOffer) {
          throw new Error("Offer not found");
        }
        return updatedOffer;
      });
    }

    if (!withinAcceptancePeriod) {
      throw new Error(
        "Candidate response already submitted or acceptance period ended",
      );
    }

    return this.respondToOffer(attempt.token, {
      decision: input.decision,
      responderName: input.responderName,
      message: input.message,
    });
  },

  async processPendingRemindersAndExpiry() {
    const now = new Date();
    const pending = await db
      .select({
        id: offerResponseAttempts.id,
        token: offerResponseAttempts.token,
        expiresAt: offerResponseAttempts.expiresAt,
        reminder48hSentAt: offerResponseAttempts.reminder48hSentAt,
        reminder24hSentAt: offerResponseAttempts.reminder24hSentAt,
        expiryNotifiedAt: offerResponseAttempts.expiryNotifiedAt,
        offerId: offers.id,
        jobId: offers.jobId,
        offerStatus: offers.status,
        candidate: {
          id: candidates.id,
          firstName: candidates.firstName,
          lastName: candidates.lastName,
          email: candidates.email,
        },
      })
      .from(offerResponseAttempts)
      .innerJoin(offers, eq(offerResponseAttempts.offerId, offers.id))
      .innerJoin(
        candidates,
        eq(offerResponseAttempts.candidateId, candidates.id),
      )
      .where(
        and(
          eq(offerResponseAttempts.status, "pending"),
          eq(offerResponseAttempts.isActive, true),
        ),
      );

    for (const item of pending) {
      const msLeft = item.expiresAt.getTime() - now.getTime();
      const hoursLeft = msLeft / (1000 * 60 * 60);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const reviewUrl = `${frontendUrl}/offer/${item.token}`;

      if (msLeft <= 0) {
        await db.transaction(async (tx) => {
          await tx
            .update(offerResponseAttempts)
            .set({
              status: "expired",
              isActive: false,
              expiryNotifiedAt: now,
              updatedAt: now,
            })
            .where(eq(offerResponseAttempts.id, item.id));

          await tx
            .update(offers)
            .set({
              status: "withdrawn",
              updatedAt: now,
            })
            .where(eq(offers.id, item.offerId));
        });

        await notifyHiringTeamAboutOfferDecision({
          offerId: item.offerId,
          candidateId: item.candidate.id,
          jobId: item.jobId,
          decision: "declined",
          candidateName:
            `${item.candidate.firstName} ${item.candidate.lastName}`.trim(),
          candidateMessage: "Offer expired without candidate response.",
        });
        continue;
      }

      if (hoursLeft <= 24 && !item.reminder24hSentAt) {
        await mailService.sendOfferEmail(
          item.candidate.email,
          "Offer reminder: 24 hours left",
          `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <p>Hello ${item.candidate.firstName},</p>
              <p>This is a reminder that your offer will expire in less than 24 hours.</p>
              <p><a href="${reviewUrl}">Review Offer</a></p>
            </div>
          `,
        );
        await db
          .update(offerResponseAttempts)
          .set({ reminder24hSentAt: now, updatedAt: now })
          .where(eq(offerResponseAttempts.id, item.id));
        continue;
      }

      if (hoursLeft <= 48 && !item.reminder48hSentAt) {
        await mailService.sendOfferEmail(
          item.candidate.email,
          "Offer reminder: 48 hours left",
          `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <p>Hello ${item.candidate.firstName},</p>
              <p>This is a reminder that your offer will expire in less than 48 hours.</p>
              <p><a href="${reviewUrl}">Review Offer</a></p>
            </div>
          `,
        );
        await db
          .update(offerResponseAttempts)
          .set({ reminder48hSentAt: now, updatedAt: now })
          .where(eq(offerResponseAttempts.id, item.id));
      }
    }
  },
};
