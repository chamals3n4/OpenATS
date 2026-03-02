import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const mailService = {
  async sendEmail({ to, subject, html }: SendEmailOptions) {
    try {
      const { data, error } = await resend.emails.send({
        from: `OpenATS <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error("Resend error:", error);
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      console.error("Failed to send email:", err);
      throw err;
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
};
