import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

import {
  buildPasswordEmail,
  isAuthMailConfigured,
  mustStartTls,
  sendPasswordLinkEmail,
} from "@/lib/auth/password-emails";

const URL =
  "http://localhost:3000/api/auth/reset-password/tok123?callbackURL=%2Freset-password";

beforeEach(() => {
  sendMail.mockResolvedValue({ messageId: "<1@test>" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  sendMail.mockReset();
});

function configure() {
  vi.stubEnv("SMTP_HOST", "smtp.example.test");
  vi.stubEnv("MAIL_FROM", "no-reply@example.test");
}

function unconfigure() {
  vi.stubEnv("SMTP_HOST", "");
  vi.stubEnv("MAIL_FROM", "");
}

describe("buildPasswordEmail", () => {
  it("writes a set-password email for an invite", () => {
    const email = buildPasswordEmail("invite", { name: "Ada", url: URL });

    expect(email.subject).toBe("Set your password for OpenATS");
    expect(email.html).toContain("Set your password");
    expect(email.html).toContain("Hi Ada,");
    expect(email.html).toContain("24 hours");
  });

  it("writes a reset email for a reset", () => {
    const email = buildPasswordEmail("reset", { name: "Ada", url: URL });

    expect(email.subject).toBe("Reset your OpenATS password");
    expect(email.html).toContain("Reset your password");
    expect(email.html).toContain("you can ignore this email");
  });

  it("links to the url, escaped for an attribute", () => {
    const email = buildPasswordEmail("reset", { url: `${URL}&a=b` });

    expect(email.html).toContain(`href="${URL}&amp;a=b"`);
  });

  it("escapes the user's name", () => {
    const email = buildPasswordEmail("invite", {
      name: '<img src=x onerror="alert(1)">',
      url: URL,
    });

    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
  });

  it("greets without a name when there is none", () => {
    expect(buildPasswordEmail("reset", { name: " ", url: URL }).html).toContain(
      "Hi,",
    );
  });
});

describe("isAuthMailConfigured", () => {
  it("needs both the key and the from address", () => {
    unconfigure();
    expect(isAuthMailConfigured()).toBe(false);

    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    expect(isAuthMailConfigured()).toBe(false);

    vi.stubEnv("MAIL_FROM", "no-reply@example.test");
    expect(isAuthMailConfigured()).toBe(true);
  });

  it("is not configured when SMTP_PORT is not a valid port", () => {
    configure();
    for (const port of ["abc", "0", "65536", "25.5"]) {
      vi.stubEnv("SMTP_PORT", port);
      expect(isAuthMailConfigured()).toBe(false);
    }
    vi.stubEnv("SMTP_PORT", "465");
    expect(isAuthMailConfigured()).toBe(true);
    vi.stubEnv("SMTP_PORT", "");
    expect(isAuthMailConfigured()).toBe(true);
  });
});

describe("mustStartTls", () => {
  it("is needed only for a remote server without implicit TLS", () => {
    expect(mustStartTls("smtp.example.test", false)).toBe(true);
    expect(mustStartTls("smtp.example.test", true)).toBe(false);
    expect(mustStartTls("localhost", false)).toBe(false);
    expect(mustStartTls("127.0.0.1", false)).toBe(false);
  });
});

describe("sendPasswordLinkEmail", () => {
  it("sends through SMTP when configured", async () => {
    configure();
    await sendPasswordLinkEmail({
      kind: "invite",
      to: "ada@example.test",
      name: "Ada",
      url: URL,
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];

    expect(message.from).toEqual({ name: "OpenATS", address: "no-reply@example.test" });
    expect(message.to).toBe("ada@example.test");
    expect(message.subject).toBe("Set your password for OpenATS");
  });

  it("logs the link in development when email is not configured", async () => {
    unconfigure();
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendPasswordLinkEmail({
      kind: "reset",
      to: "ada@example.test",
      url: URL,
    });

    expect(sendMail).not.toHaveBeenCalled();
    expect(log.mock.calls[0][0]).toContain(URL);
  });

  it("never logs the link outside development", async () => {
    unconfigure();
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendPasswordLinkEmail({
      kind: "reset",
      to: "ada@example.test",
      url: URL,
    });

    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).not.toContain("tok123");
  });

  it("does not throw when the SMTP server refuses the email", async () => {
    configure();
    sendMail.mockRejectedValue(new Error("550 sender not allowed"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendPasswordLinkEmail({
        kind: "reset",
        to: "ada@example.test",
        url: URL,
      }),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
  });
});
