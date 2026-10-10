import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPasswordEmail,
  isAuthMailConfigured,
  sendPasswordLinkEmail,
} from "@/lib/auth-mail";

const URL =
  "http://localhost:3000/api/auth/reset-password/tok123?callbackURL=%2Freset-password";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

function configure() {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_FROM_EMAIL", "no-reply@example.test");
}

function unconfigure() {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("RESEND_FROM_EMAIL", "");
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

    vi.stubEnv("RESEND_API_KEY", "re_test");
    expect(isAuthMailConfigured()).toBe(false);

    vi.stubEnv("RESEND_FROM_EMAIL", "no-reply@example.test");
    expect(isAuthMailConfigured()).toBe(true);
  });
});

describe("sendPasswordLinkEmail", () => {
  it("sends through Resend when configured", async () => {
    configure();
    await sendPasswordLinkEmail({
      kind: "invite",
      to: "ada@example.test",
      name: "Ada",
      url: URL,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(endpoint).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(body.from).toBe("OpenATS <no-reply@example.test>");
    expect(body.to).toEqual(["ada@example.test"]);
    expect(body.subject).toBe("Set your password for OpenATS");
  });

  it("logs the link in development when Resend is not configured", async () => {
    unconfigure();
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendPasswordLinkEmail({
      kind: "reset",
      to: "ada@example.test",
      url: URL,
    });

    expect(fetchMock).not.toHaveBeenCalled();
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

  it("does not throw when Resend rejects the request", async () => {
    configure();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "invalid from address",
    });
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
