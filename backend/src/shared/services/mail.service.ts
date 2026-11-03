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
export function mustStartTls(
  host: string | undefined,
  secure: boolean,
  // SMTP_REQUIRE_TLS=false allows an unencrypted server by name, such as Mailpit at "mailpit" in
  // Docker Compose; true always requires it. Unset, only this machine is exempt.
  requireTls: string | undefined = process.env.SMTP_REQUIRE_TLS,
): boolean {
  if (secure) return false;
  if (requireTls === "false") return false;
  if (requireTls === "true") return true;
  return !LOCAL_HOSTS.has((host ?? "").toLowerCase());
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

/** Codes Nodemailer gives a connection that failed or timed out, which a second try may get past. */
const TRANSIENT_CODES = new Set(["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNRESET", "ECONNREFUSED", "EDNS"]);

/**
 * Whether trying again could work: the connection failed or timed out (such as "Greeting never
 * received"), or the server answered with a 4xx code, which SMTP means as "try again later".
 * A refused address, a bad login or a rejected message (5xx) would fail the same way again.
 */
export function isTransientMailError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const { code, responseCode } = err as { code?: unknown; responseCode?: unknown };
  if (typeof responseCode === "number") return responseCode >= 400 && responseCode < 500;
  return typeof code === "string" && TRANSIENT_CODES.has(code);
}

/** How long to wait before the one retry. Short, because some callers wait for the result. */
const RETRY_DELAY_MS = 2_000;

export const mailService = {
  /** Sends, and tries once more after a short wait when the failure looks temporary. */
  async sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
    const message = { from: sender(), to, subject, html, ...(replyTo ? { replyTo } : {}) };
    try {
      const info = await getTransport().sendMail(message);
      return { id: info.messageId };
    } catch (first) {
      if (!isTransientMailError(first)) {
        logger.error(`Failed to send email: ${first instanceof Error ? first.message : String(first)}`);
        throw first;
      }
      logger.warn(
        `Sending an email failed (${first instanceof Error ? first.message : String(first)}), trying again`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      try {
        const info = await getTransport().sendMail(message);
        return { id: info.messageId };
      } catch (err) {
        logger.error(`Failed to send email after a retry: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
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
