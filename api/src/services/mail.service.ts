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

  async sendAssessmentCompletionEmail(
    to: string,
    candidateFirstName: string,
    assessmentTitle: string,
    autoSubmitReason?: string
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
