import { Resend } from "resend";
import dotenv from "dotenv";
import logger from "../utils/logger";

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
        logger.error("Resend error:", error);
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      logger.error("Failed to send email:", err);
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

  /** Send an interview invitation email to the candidate. */
  async sendInterviewInviteEmail(
    to: string,
    candidateName: string,
    jobTitle: string,
    stageName: string,
    scheduledAt: string,
    durationMinutes: number,
  ) {
    const date = new Date(scheduledAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const time = new Date(scheduledAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <h2 style="color: #1a1a1a;">Interview Invitation</h2>
        <p>Hello ${candidateName},</p>
        <p>You have been invited for an interview:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Position:</strong> ${jobTitle}</p>
          <p style="margin: 0 0 8px;"><strong>Stage:</strong> ${stageName}</p>
          <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 0 0 8px;"><strong>Time:</strong> ${time}</p>
          <p style="margin: 0;"><strong>Duration:</strong> ${durationMinutes} minutes</p>
        </div>
        <p>Please confirm your availability. If you have any questions, contact the hiring team.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 14px; color: #666;">This is an automated message from OpenATS.</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Interview Invitation — ${jobTitle}`,
      html,
    });
  },

  /** Send interview slot selection email to candidate. */
  async sendInterviewSlotEmail(
    to: string,
    candidateName: string,
    eventName: string,
    jobTitle: string,
    eventType: string,
    meetingUrl: string | null,
    location: string | null,
    bodyText: string | null,
    publicUrl: string,
  ) {
    const typeLabel = eventType === "onsite" ? "On-site" : "Virtual";
    const html = [
      '<div style="font-family:sans-serif;line-height:1.6;color:#333;max-width:600px">',
      `<h2 style="color:#1a1a1a">${eventName}</h2>`,
      `<p>Hello ${candidateName},</p>`,
      bodyText ? `<p>${bodyText.replace(/\n/g, "<br>")}</p>` : "",
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">',
      `<p style="margin:0 0 8px"><strong>Position:</strong> ${jobTitle}</p>`,
      `<p style="margin:0 0 8px"><strong>Type:</strong> ${typeLabel}</p>`,
      meetingUrl
        ? `<p style="margin:0"><strong>Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>`
        : "",
      location
        ? `<p style="margin:0"><strong>Location:</strong> ${location}</p>`
        : "",
      "</div>",
      '<div style="text-align:center;margin:24px 0">',
      `<a href="${publicUrl}" style="background:#007bff;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:16px;display:inline-block">View Available Time Slots</a>`,
      "</div>",
      "<p>Click the button above to select a time that works for you.</p>",
      '<hr style="border:0;border-top:1px solid #eee;margin:20px 0">',
      '<p style="font-size:14px;color:#666">This is an automated message from OpenATS.</p>',
      "</div>",
    ].join("\n");

    return this.sendEmail({
      to,
      subject: `${eventName} — ${jobTitle}`,
      html,
    });
  },
};
