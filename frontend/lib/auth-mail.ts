// Account emails (invite and password reset). Better Auth runs in the Next.js
// server, so these are sent from here rather than from the Express mail service.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Must match `resetPasswordTokenExpiresIn` in auth-options.ts.
export const PASSWORD_LINK_EXPIRES_IN_SECONDS = 60 * 60 * 24;
const EXPIRY_TEXT = "24 hours";

export type PasswordLinkKind = "invite" | "reset";

/** Whether invite and reset emails can actually be sent. */
export function isAuthMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Same layout as backend/src/shared/services/mail.service.ts (inline styles
// only — email clients strip <style>).

function emailButton(href: string, label: string): string {
  return [
    '<div style="text-align:center;margin:28px 0 8px">',
    `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;padding:12px 32px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none">${label}</a>`,
    "</div>",
  ].join("");
}

function emailCard(opts: {
  heading: string;
  subtitle?: string;
  bodyHtml: string;
}): string {
  return [
    "<div style=\"background:#f1f5f9;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif\">",
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">',
    '<div style="background:#0a0a0a;padding:28px 28px 24px">',
    `<h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3">${opts.heading}</h1>`,
    opts.subtitle
      ? `<p style="margin:6px 0 0;font-size:14px;color:#a3a3a3">${opts.subtitle}</p>`
      : "",
    "</div>",
    '<div style="padding:24px 28px 28px">',
    opts.bodyHtml,
    "</div>",
    "</div>",
    '<p style="text-align:center;font-size:12px;color:#94a3b8;margin:16px 0 0">Powered by OpenATS</p>',
    "</div>",
  ].join("");
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155">${html}</p>`;
}

function fallbackLink(url: string): string {
  const safe = escapeHtml(url);
  return [
    '<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">',
    "If the button does not work, copy this link into your browser:<br>",
    `<a href="${safe}" style="color:#64748b;word-break:break-all">${safe}</a>`,
    "</p>",
  ].join("");
}

export function buildPasswordEmail(
  kind: PasswordLinkKind,
  opts: { name?: string | null; url: string },
): { subject: string; html: string } {
  const greeting = paragraph(
    opts.name?.trim() ? `Hi ${escapeHtml(opts.name.trim())},` : "Hi,",
  );

  if (kind === "invite") {
    return {
      subject: "Set your password for OpenATS",
      html: emailCard({
        heading: "Set your password",
        subtitle: "You have been invited to OpenATS",
        bodyHtml: [
          greeting,
          paragraph(
            "An account has been created for you on OpenATS. Choose a password to finish setting it up.",
          ),
          emailButton(opts.url, "Set your password"),
          paragraph(
            `This link expires in ${EXPIRY_TEXT} and can be used once. If it has expired, use "Forgot password?" on the sign-in page to get a new one.`,
          ),
          fallbackLink(opts.url),
        ].join(""),
      }),
    };
  }

  return {
    subject: "Reset your OpenATS password",
    html: emailCard({
      heading: "Reset your password",
      bodyHtml: [
        greeting,
        paragraph(
          "We received a request to reset the password for your OpenATS account.",
        ),
        emailButton(opts.url, "Reset your password"),
        paragraph(
          `This link expires in ${EXPIRY_TEXT} and can be used once. If you did not ask for this, you can ignore this email and your password will stay the same.`,
        ),
        fallbackLink(opts.url),
      ].join(""),
    }),
  };
}

async function sendThroughResend(message: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `OpenATS <${process.env.RESEND_FROM_EMAIL}>`,
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${detail}`);
  }
}

/**
 * Sends the invite or reset email. Never throws: a failure here must not
 * change the response to a password reset request, which would reveal
 * whether the email belongs to an account.
 */
export async function sendPasswordLinkEmail(opts: {
  kind: PasswordLinkKind;
  to: string;
  name?: string | null;
  url: string;
}): Promise<void> {
  if (!isAuthMailConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[auth-mail] Resend is not configured. ${opts.kind === "invite" ? "Set password" : "Reset password"} link for ${opts.to}:\n${opts.url}`,
      );
    } else {
      // The link is a credential, so it is never logged outside development.
      console.warn(
        `[auth-mail] Resend is not configured; no ${opts.kind} email was sent. Set RESEND_API_KEY and RESEND_FROM_EMAIL.`,
      );
    }
    return;
  }

  try {
    const { subject, html } = buildPasswordEmail(opts.kind, opts);
    await sendThroughResend({ to: opts.to, subject, html });
  } catch (error) {
    console.error(`[auth-mail] Failed to send ${opts.kind} email:`, error);
  }
}
