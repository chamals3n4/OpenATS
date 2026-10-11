import { Resend } from "resend";
import dotenv from "dotenv";
import logger from "../../utils/logger";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Where a reply should go. Without it, replies go to the From address. */
  replyTo?: string;
}

export const mailService = {
  async sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
    try {
      const { data, error } = await resend.emails.send({
        from: `OpenATS <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });

      if (error) {
        logger.error("Resend error:", error);
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      logger.error("Failed to send email:", err);
      throw err;
    }
  },
};
