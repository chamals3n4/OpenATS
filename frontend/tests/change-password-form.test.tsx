import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const changePassword = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: { changePassword: (...args: unknown[]) => changePassword(...args) },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ChangePasswordForm } from "@/app/(dashboard)/settings/profile/_components/change-password-form";
import { changePasswordErrorMessage } from "@/lib/auth-errors";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fill(current: string, next: string, confirmation = next) {
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: current },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: next },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirmation },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Change password" }));
}

describe("changePasswordErrorMessage", () => {
  it("says the current password is wrong", () => {
    expect(changePasswordErrorMessage({ code: "INVALID_PASSWORD" })).toBe(
      "Your current password is incorrect.",
    );
  });

  it("explains the length rule and throttling", () => {
    expect(changePasswordErrorMessage({ code: "PASSWORD_TOO_SHORT" })).toBe(
      "Use 8 to 128 characters.",
    );
    expect(changePasswordErrorMessage({ status: 429 })).toMatch(
      /Too many attempts/,
    );
  });
});

describe("ChangePasswordForm", () => {
  it("asks to sign out other sessions when it changes the password", async () => {
    changePassword.mockResolvedValue({ data: {}, error: null });
    render(<ChangePasswordForm />);
    fill("old-password", "new-password-1");
    submit();

    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "old-password",
      newPassword: "new-password-1",
      revokeOtherSessions: true,
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Current password")).toHaveValue(""),
    );
  });

  it("sends nothing when the new password breaks the rules", () => {
    render(<ChangePasswordForm />);

    fill("old-password", "short");
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use 8 to 128 characters.",
    );

    fill("old-password", "new-password-1", "new-password-2");
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The passwords do not match.",
    );

    fill("same-password", "same-password");
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(/different from your current/);

    fill("", "new-password-1");
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter your current password.",
    );

    expect(changePassword).not.toHaveBeenCalled();
  });

  it("shows a clear message when the current password is wrong, and keeps the form", async () => {
    changePassword.mockResolvedValue({
      data: null,
      error: { code: "INVALID_PASSWORD", status: 400 },
    });
    render(<ChangePasswordForm />);
    fill("wrong-password", "new-password-1");
    submit();

    expect(
      await screen.findByText("Your current password is incorrect."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toHaveValue("new-password-1");
  });
});
