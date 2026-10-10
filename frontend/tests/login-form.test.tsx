import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const signInEmail = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: (...args: unknown[]) => signInEmail(...args) } },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import LoginPage from "@/app/login/page";
import { validateSignIn } from "@/lib/auth-errors";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("validateSignIn", () => {
  it("passes an email and a password", () => {
    expect(validateSignIn({ email: "ada@example.com", password: "x" })).toEqual(
      {},
    );
  });

  it("requires both fields", () => {
    expect(validateSignIn({ email: " ", password: "" })).toEqual({
      email: "Enter your email.",
      password: "Enter your password.",
    });
  });

  it("rejects text that is not an email address", () => {
    for (const email of ["ada", "ada@", "ada@example", "a da@example.com"]) {
      expect(validateSignIn({ email, password: "x" }).email).toBe(
        "Enter a valid email address.",
      );
    }
  });

  it("does not apply password length rules on sign-in", () => {
    expect(
      validateSignIn({ email: "ada@example.com", password: "a" }).password,
    ).toBeUndefined();
  });
});

describe("sign-in form", () => {
  it("shows field errors and sends nothing when the form is empty", () => {
    render(<LoginPage />);
    submit();

    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before calling the server", () => {
    render(<LoginPage />);
    fill("not-an-email", "secret-password");
    submit();

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in with the trimmed email and goes to the dashboard", async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<LoginPage />);
    fill("  ada@example.com ", "secret-password");
    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "secret-password",
    });
  });

  it("shows a generic message for wrong credentials and stays on the page", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 },
    });
    render(<LoginPage />);
    fill("ada@example.com", "wrong-password");
    submit();

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("has no sign-up link", () => {
    render(<LoginPage />);

    expect(screen.queryByText(/sign up|create an account|register/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("shows no demo credentials unless demo mode is on", () => {
    render(<LoginPage />);

    expect(screen.queryByText("Demo credentials")).toBeNull();
  });
});
