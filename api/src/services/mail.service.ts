/**
 * Email delivery is implemented with Resend (https://resend.com).
 *
 * Integration surface:
 * - This module (`mailService.sendEmail`) is the only place that calls `resend.emails.send`.
 * - Callers: `offer.service` (offer letter), `candidate.service` (rejection), `assessment-execution.service` (invites / completion).
 * - Env: `RESEND_API_KEY`, optional `RESEND_FROM_EMAIL` (see `api/.env.example`).
 * - Default `from` is `onboarding@resend.dev` (works with a valid API key). Use a verified domain address in production.
 */
import { Resend } from "resend";
import logger from "../utils/logger";

/** Resend’s sandbox sender — works without domain verification. Override via `RESEND_FROM_EMAIL` after you verify a domain in Resend. */
const DEFAULT_FROM = "onboarding@resend.dev";

function getFromEmail(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (!raw) return DEFAULT_FROM;
  // Resend only allows verified domains as `from`. Public Gmail addresses fail the API until you verify a domain.
  const lower = raw.toLowerCase();
  if (lower.endsWith("@gmail.com") || lower.endsWith("@googlemail.com")) {
    console.warn(
      "[mail] RESEND_FROM_EMAIL is a Gmail address; Resend cannot send from it until you verify a domain. Using onboarding@resend.dev. Remove RESEND_FROM_EMAIL or set a verified domain address.",
    );
    return DEFAULT_FROM;
  }
  return raw;
}

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set on the API server. Add it to api/.env and restart the API.",
    );
  }
  return new Resend(key);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const mailService = {
  async sendEmail({ to, subject, html }: SendEmailOptions) {
    const resend = getResendClient();
    const fromAddr = getFromEmail();

    try {
      const { data, error } = await resend.emails.send({
        from: `OpenATS <${fromAddr}>`,
        to: [to],
        subject,
        html,
      });

      if (error) {
        logger.error("Resend error:", error);
        const msg =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: string }).message)
            : JSON.stringify(error);
        throw new Error(msg || "Resend rejected the email");
      }

      return data;
    } catch (err) {
      logger.error("Failed to send email:", err);
      const message =
        err instanceof Error ? err.message : "Failed to send email";
      throw err instanceof Error ? err : new Error(message);
    }
  },

  async sendOfferEmail(to: string, subject: string, html: string) {
    return this.sendEmail({ to, subject, html });
  },

  async sendRejectionEmail(to: string, subject: string, html: string) {
    return this.sendEmail({ to, subject, html });
  },

  async sendAssessmentInviteEmail(to: string, subject: string, html: string) {
    return this.sendEmail({ to, subject, html });
  },

  async sendAssessmentCompletionEmail(
    to: string,
    candidateFirstName: string,
    assessmentTitle: string,
    autoSubmitReason?: string,
  ) {
    const subject = autoSubmitReason
      ? `Assessment Auto-Submitted: ${assessmentTitle}`
      : `Assessment Completed: ${assessmentTitle}`;

    const html = autoSubmitReason
      ? `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello ${candidateFirstName},</h2>
          <p>Your assessment responses for <strong>${assessmentTitle}</strong> were saved.</p>
          <p>Your assessment was automatically submitted due to the following reason:</p>
          <p style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:10px 12px;color:#9a3412;">
            ${autoSubmitReason}
          </p>
          <p>If you believe this is a mistake, please contact the hiring team.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 14px; color: #666;">This is an automated message from OpenATS.</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>Hello ${candidateFirstName},</h2>
          <p>Your assessment responses for <strong>${assessmentTitle}</strong> are saved successfully.</p>
          <p>You have completed the quiz successfully. Thank you for your submission.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 14px; color: #666;">This is an automated message from OpenATS.</p>
        </div>
      `;

    return this.sendEmail({ to, subject, html });
  },
};
