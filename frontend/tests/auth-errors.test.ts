import { describe, expect, it } from "vitest";
import {
  isInvalidResetToken,
  resetPasswordErrorMessage,
  signInErrorMessage,
  validateNewPassword,
} from "@/lib/auth-errors";

describe("signInErrorMessage", () => {
  it("gives the same generic message for a wrong password and an unknown email", () => {
    const wrongPassword = signInErrorMessage({
      code: "INVALID_EMAIL_OR_PASSWORD",
      status: 401,
    });
    const unknownEmail = signInErrorMessage({ status: 401 });

    expect(wrongPassword).toBe("Invalid email or password.");
    expect(unknownEmail).toBe(wrongPassword);
  });

  it("reports a deactivated or banned account", () => {
    expect(
      signInErrorMessage({ code: "ACCOUNT_DEACTIVATED", status: 403 }),
    ).toMatch(/deactivated/);
    expect(signInErrorMessage({ code: "BANNED_USER", status: 403 })).toMatch(
      /deactivated/,
    );
  });

  it("reports too many attempts ahead of any other reading", () => {
    expect(
      signInErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 429 }),
    ).toMatch(/Too many attempts/);
  });

  it("does not pass a server message through", () => {
    const message = signInErrorMessage({
      status: 500,
      message: "relation users does not exist",
    });
    expect(message).toBe("Something went wrong. Please try again.");
  });
});

describe("reset password", () => {
  it("treats an invalid, expired or orphaned token as an invalid link", () => {
    expect(isInvalidResetToken({ code: "INVALID_TOKEN" })).toBe(true);
    expect(isInvalidResetToken({ code: "USER_NOT_FOUND" })).toBe(true);
    expect(isInvalidResetToken({ code: "PASSWORD_TOO_SHORT" })).toBe(false);
    expect(isInvalidResetToken(null)).toBe(false);
  });

  it("explains the length rule when the server rejects the password", () => {
    expect(resetPasswordErrorMessage({ code: "PASSWORD_TOO_SHORT" })).toBe(
      "Use 8 to 128 characters.",
    );
  });
});

describe("validateNewPassword", () => {
  it("accepts 8 to 128 characters", () => {
    expect(validateNewPassword("a".repeat(8), "a".repeat(8))).toBeNull();
    expect(validateNewPassword("a".repeat(128), "a".repeat(128))).toBeNull();
  });

  it("rejects passwords outside the range", () => {
    expect(validateNewPassword("a".repeat(7), "a".repeat(7))).toBe(
      "Use 8 to 128 characters.",
    );
    expect(validateNewPassword("a".repeat(129), "a".repeat(129))).toBe(
      "Use 8 to 128 characters.",
    );
  });

  it("rejects a confirmation that does not match", () => {
    expect(validateNewPassword("correct-horse", "correct-horsf")).toBe(
      "The passwords do not match.",
    );
  });
});
