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
}

// Shared interview email layout (inline styles only — email clients strip <style>)

function emailDetailRow(label: string, value: string): string {
  return [
    '<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9">',
    `<div style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px">${label}</div>`,
    `<div style="font-size:14px;color:#0f172a;font-weight:500">${value}</div>`,
    "</td></tr>",
  ].join("");
}

function emailButton(href: string, label: string): string {
  return [
    '<div style="text-align:center;margin:28px 0 8px">',
    `<a href="${href}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:12px 32px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none">${label}</a>`,
    "</div>",
  ].join("");
}

function emailCard(opts: {
  heading: string;
  badge?: string;
  subtitle?: string;
  bodyHtml: string;
}): string {
  return [
    '<div style="background:#f1f5f9;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">',
    // Dark header
    '<div style="background:#0a0a0a;padding:28px 28px 24px">',
    opts.badge
      ? `<span style="display:inline-block;background:rgba(255,255,255,0.12);color:#e5e5e5;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:9999px;margin-bottom:12px">${opts.badge}</span>`
      : "",
    `<h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3">${opts.heading}</h1>`,
    opts.subtitle
      ? `<p style="margin:6px 0 0;font-size:14px;color:#a3a3a3">${opts.subtitle}</p>`
      : "",
    "</div>",
    // Body
    '<div style="padding:24px 28px 28px">',
    opts.bodyHtml,
    "</div>",
    "</div>",
    '<p style="text-align:center;font-size:12px;color:#94a3b8;margin:16px 0 0">Powered by OpenATS</p>',
    "</div>",
  ].join("");
}

function formatEmailDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEmailTime(d: Date): string {
  // Include the timezone so the rendered time is unambiguous
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
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
    const when = new Date(scheduledAt);

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">Hello ${candidateName},</p>`,
      `<p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.6">You have been invited for an interview. Here are the details:</p>`,
      '<table style="width:100%;border-collapse:collapse;margin:8px 0 4px">',
      emailDetailRow("Position", jobTitle),
      emailDetailRow("Stage", stageName),
      emailDetailRow("Date", formatEmailDate(when)),
      emailDetailRow("Time", formatEmailTime(when)),
      emailDetailRow("Duration", `${durationMinutes} minutes`),
      "</table>",
      `<p style="margin:16px 0 0;font-size:14px;color:#334155;line-height:1.6">Please confirm your availability. If you have any questions, contact the hiring team.</p>`,
    ].join("\n");

    const html = emailCard({
      badge: "Interview Invitation",
      heading: jobTitle,
      subtitle: stageName,
      bodyHtml,
    });

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

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">Hello ${candidateName},</p>`,
      bodyText
        ? `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">${bodyText.replace(/\n/g, "<br>")}</p>`
        : "",
      '<table style="width:100%;border-collapse:collapse;margin:8px 0 4px">',
      emailDetailRow("Position", jobTitle),
      emailDetailRow("Interview Type", typeLabel),
      meetingUrl
        ? emailDetailRow(
            "Meeting Link",
            `<a href="${meetingUrl}" style="color:#2563eb;text-decoration:none;word-break:break-all">${meetingUrl}</a>`,
          )
        : "",
      location ? emailDetailRow("Location", location) : "",
      "</table>",
      emailButton(publicUrl, "Select a Time Slot"),
      '<p style="margin:0;text-align:center;font-size:13px;color:#64748b">Pick a time that works best for you.</p>',
    ].join("\n");

    const html = emailCard({
      badge: typeLabel,
      heading: eventName,
      subtitle: jobTitle,
      bodyHtml,
    });

    return this.sendEmail({
      to,
      subject: `${eventName} — ${jobTitle}`,
      html,
    });
  },

  /** Send interview confirmation email once the candidate has picked a time slot. */
  async sendInterviewConfirmationEmail(
    to: string,
    candidateName: string,
    eventName: string,
    eventType: string,
    scheduledAt: Date,
    durationMinutes: number,
    meetingUrl: string | null,
    location: string | null,
  ) {
    const typeLabel = eventType === "onsite" ? "On-site" : "Virtual";

    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">Hello ${candidateName},</p>`,
      `<p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.6">Your interview for <strong>${eventName}</strong> is confirmed. Here are the details:</p>`,
      '<table style="width:100%;border-collapse:collapse;margin:8px 0 4px">',
      emailDetailRow("Date", formatEmailDate(scheduledAt)),
      emailDetailRow("Time", formatEmailTime(scheduledAt)),
      emailDetailRow("Duration", `${durationMinutes} minutes`),
      emailDetailRow("Interview Type", typeLabel),
      location ? emailDetailRow("Location", location) : "",
      "</table>",
      meetingUrl ? emailButton(meetingUrl, "Join the Meeting") : "",
      meetingUrl
        ? `<p style="margin:0;text-align:center;font-size:12px;color:#94a3b8;word-break:break-all">${meetingUrl}</p>`
        : "",
      `<p style="margin:16px 0 0;font-size:14px;color:#334155;line-height:1.6">We look forward to speaking with you. If you have any questions, contact the hiring team.</p>`,
    ].join("\n");

    const html = emailCard({
      badge: "Interview Confirmed",
      heading: eventName,
      subtitle: `${formatEmailDate(scheduledAt)} · ${formatEmailTime(scheduledAt)}`,
      bodyHtml,
    });

    return this.sendEmail({
      to,
      subject: `Interview Confirmed — ${eventName}`,
      html,
    });
  },

  /** Notify the candidate that a previously confirmed interview was cancelled. */
  async sendInterviewCancellationEmail(
    to: string,
    candidateName: string,
    eventName: string,
    scheduledAt: Date | null,
  ) {
    const bodyHtml = [
      `<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6">Hello ${candidateName},</p>`,
      `<p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.6">Your interview <strong>${eventName}</strong>${
        scheduledAt
          ? ` scheduled for <strong>${formatEmailDate(scheduledAt)} at ${formatEmailTime(scheduledAt)}</strong>`
          : ""
      } has been cancelled.</p>`,
      `<p style="margin:16px 0 0;font-size:14px;color:#334155;line-height:1.6">If new times become available, the hiring team will reach out with an updated invitation. We apologise for any inconvenience.</p>`,
    ].join("\n");

    const html = emailCard({
      badge: "Interview Cancelled",
      heading: eventName,
      subtitle: scheduledAt
        ? `${formatEmailDate(scheduledAt)} · ${formatEmailTime(scheduledAt)}`
        : undefined,
      bodyHtml,
    });

    return this.sendEmail({
      to,
      subject: `Interview Cancelled — ${eventName}`,
      html,
    });
  },
};
