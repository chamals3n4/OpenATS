import nodemailer, { type Transporter } from "nodemailer";
import logger from "../../utils/logger";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Where a reply should go. Without it, replies go to the From address. */
  replyTo?: string;
}

let transport: Transporter | null = null;

// Servers on this machine, such as Mailpit, which offer no encryption
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Whether to refuse sending unless the server upgrades the connection with STARTTLS. */
export function mustStartTls(host: string | undefined, secure: boolean): boolean {
  return !secure && !LOCAL_HOSTS.has((host ?? "").toLowerCase());
}

// Created on first use, so the settings are read after the environment is loaded
function getTransport(): Transporter {
  if (!transport) {
    const user = process.env.SMTP_USER;
    const secure = process.env.SMTP_SECURE === "true";
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure,
      // Without this, a server that does not offer STARTTLS would get the password and the email unencrypted
      requireTLS: mustStartTls(process.env.SMTP_HOST, secure),
      ...(user ? { auth: { user, pass: process.env.SMTP_PASSWORD ?? "" } } : {}),
      pool: true,
      // A slow server must not hang the request that sends the email
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transport;
}

function sender() {
  return { name: process.env.MAIL_FROM_NAME || "OpenATS", address: process.env.MAIL_FROM ?? "" };
}

export const mailService = {
  async sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
    try {
      const info = await getTransport().sendMail({
        from: sender(),
        to,
        subject,
        html,
        ...(replyTo ? { replyTo } : {}),
      });
      return { id: info.messageId };
    } catch (err) {
      logger.error(`Failed to send email: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  },

  /** Checks the SMTP server can be reached and logged in to. Logs instead of throwing. */
  async verify(): Promise<boolean> {
    try {
      await getTransport().verify();
      logger.info(`SMTP ready: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`);
      return true;
    } catch (err) {
      logger.warn(
        `SMTP check failed (${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}): ${
          err instanceof Error ? err.message : String(err)
        }. Emails will fail until this is fixed.`,
      );
      return false;
    }
  },
};
