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
import {
  buildAssessmentCompletionFallbackInner,
  plainTextToFallbackEmailHtml,
  wrapFallbackEmail,
} from "../utils/email-fallback-layout";

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

/** Turns a plain-text compose body into safe HTML (same block styles + footer as system fallbacks). */
export function formatPlainTextAsHtmlEmail(body: string): string {
  return plainTextToFallbackEmailHtml(body);
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

    const html = wrapFallbackEmail(
      buildAssessmentCompletionFallbackInner({
        firstName: candidateFirstName,
        assessmentTitle,
        autoSubmitReason,
      }),
    );

    return this.sendEmail({ to, subject, html });
  },
};
