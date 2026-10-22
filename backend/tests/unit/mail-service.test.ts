import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn(async (_message: Record<string, unknown>) => ({ messageId: "<1@test>" }));
const createTransport = vi.fn((_options: Record<string, unknown>) => ({ sendMail, verify: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

describe("mailService", () => {
  beforeEach(() => {
    vi.resetModules();
    createTransport.mockClear();
    sendMail.mockClear();
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_SECURE", "true");
    vi.stubEnv("SMTP_USER", "mailer");
    vi.stubEnv("SMTP_PASSWORD", "secret");
    vi.stubEnv("MAIL_FROM", "hiring@example.test");
    vi.stubEnv("MAIL_FROM_NAME", "Acme Hiring");
  });

  it("sends through the SMTP server from the settings", async () => {
    const { mailService } = await import("../../src/shared/services/mail.service");
    await mailService.sendEmail({ to: "ada@example.test", subject: "Hi", html: "<p>Hi</p>", replyTo: "hr@example.test" });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.example.test", port: 465, secure: true, auth: { user: "mailer", pass: "secret" } }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: "Acme Hiring", address: "hiring@example.test" },
      to: "ada@example.test",
      subject: "Hi",
      html: "<p>Hi</p>",
      replyTo: "hr@example.test",
    });
  });

  it("logs in only when a user is set, as for Mailpit", async () => {
    vi.stubEnv("SMTP_USER", "");
    const { mailService } = await import("../../src/shared/services/mail.service");
    await mailService.sendEmail({ to: "ada@example.test", subject: "Hi", html: "" });

    expect(createTransport.mock.calls[0]![0]).not.toHaveProperty("auth");
  });

  it("requires STARTTLS on a remote server that does not start encrypted", async () => {
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_SECURE", "false");
    const { mailService } = await import("../../src/shared/services/mail.service");
    await mailService.sendEmail({ to: "ada@example.test", subject: "Hi", html: "" });

    expect(createTransport.mock.calls[0]![0]).toMatchObject({ secure: false, requireTLS: true });
  });

  it("does not require STARTTLS for Mailpit on this machine", async () => {
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("SMTP_SECURE", "false");
    const { mailService } = await import("../../src/shared/services/mail.service");
    await mailService.sendEmail({ to: "ada@example.test", subject: "Hi", html: "" });

    expect(createTransport.mock.calls[0]![0]).toMatchObject({ requireTLS: false });
  });
});

describe("mustStartTls", () => {
  it("is needed only for a remote server without implicit TLS", async () => {
    const { mustStartTls } = await import("../../src/shared/services/mail.service");

    expect(mustStartTls("smtp.example.test", false)).toBe(true);
    expect(mustStartTls("smtp.example.test", true)).toBe(false);
    expect(mustStartTls("localhost", false)).toBe(false);
    expect(mustStartTls("127.0.0.1", false)).toBe(false);
    expect(mustStartTls("::1", false)).toBe(false);
  });
});
