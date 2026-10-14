import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@/types";

const api = vi.hoisted(() => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  sendPasswordResetLink: vi.fn(),
  setUserPassword: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/users/client", () => api);
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/hooks/queries/use-user", () => ({
  useCurrentUser: () => ({ data: { data: { id: 1, role: "super_admin" } } }),
}));

import { UserManagementClient } from "@/app/(dashboard)/settings/user-management/_components/user-management-client";

const user = (id: number, firstName: string, email: string, role: User["role"] = "interviewer") =>
  ({ id, firstName, lastName: "Perera", email, role }) as User;

const ada = user(1, "Ada", "ada@example.com", "super_admin");
const nimal = user(2, "Nimal", "nimal@example.com");

let queryClient: QueryClient;

function renderPage(inviteEmailEnabled = true) {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserManagementClient inviteEmailEnabled={inviteEmailEnabled} />
    </QueryClientProvider>,
  );
}

const rowOf = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;

beforeEach(() => {
  api.fetchUsers.mockResolvedValue([ada, nimal]);
  api.createUser.mockResolvedValue({ success: true });
  api.updateUser.mockResolvedValue(nimal);
  api.deleteUser.mockResolvedValue(undefined);
  api.setUserPassword.mockResolvedValue(undefined);
  api.sendPasswordResetLink.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("user list", () => {
  it("lists users and filters by name or email", async () => {
    renderPage();
    expect(await screen.findByText("Nimal Perera")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search User"), { target: { value: "ada@" } });

    expect(screen.getByText("Ada Perera")).toBeTruthy();
    expect(screen.queryByText("Nimal Perera")).toBeNull();
  });

  it("does not let you remove your own account", async () => {
    renderPage();
    await screen.findByText("Ada Perera");

    const remove = within(rowOf("Ada Perera")).getByRole("button", { name: /delete/i });
    expect((remove as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("creating a user", () => {
  it("sends an invite by default when email is set up", async () => {
    renderPage();
    await screen.findByText("Ada Perera");
    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    fireEvent.change(screen.getByPlaceholderText("Enter the email address"), {
      target: { value: " kamal@example.com " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter the first name"), {
      target: { value: "Kamal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({
        email: "kamal@example.com",
        firstName: "Kamal",
        lastName: "",
        role: "interviewer",
        method: "invite",
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invitation sent"));
  });

  it("needs a valid password when email is not set up", async () => {
    renderPage(false);
    await screen.findByText("Ada Perera");
    fireEvent.click(screen.getByRole("button", { name: /create user/i }));

    fireEvent.change(screen.getByPlaceholderText("Enter the email address"), {
      target: { value: "kamal@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter the first name"), {
      target: { value: "Kamal" },
    });
    fireEvent.change(screen.getByLabelText("Password *"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/^Password: must be between/));
    expect(api.createUser).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Password *"), { target: { value: "a-long-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ method: "set", password: "a-long-password" }),
      ),
    );
  });

  it("asks for the email and first name", async () => {
    renderPage();
    await screen.findByText("Ada Perera");
    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(toast.error).toHaveBeenCalledWith("Email and first name are required.");
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it("refreshes the app wide users list too", async () => {
    renderPage();
    await screen.findByText("Ada Perera");
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: /create user/i }));
    fireEvent.change(screen.getByPlaceholderText("Enter the email address"), {
      target: { value: "kamal@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter the first name"), {
      target: { value: "Kamal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["user-management"] });
  });
});

describe("editing, passwords and removing", () => {
  it("saves the edited user", async () => {
    renderPage();
    await screen.findByText("Nimal Perera");
    fireEvent.click(within(rowOf("Nimal Perera")).getByRole("button", { name: /edit/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByDisplayValue("Nimal"), { target: { value: "Nimali" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(api.updateUser).toHaveBeenCalledWith(2, {
        firstName: "Nimali",
        lastName: "Perera",
        email: "nimal@example.com",
        role: "interviewer",
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("User updated"));
  });

  it("sets a new password only when it is long enough", async () => {
    renderPage();
    await screen.findByText("Nimal Perera");
    fireEvent.click(within(rowOf("Nimal Perera")).getByRole("button", { name: /more actions/i }));
    fireEvent.click(await screen.findByText("Set new password"));

    fireEvent.change(screen.getByLabelText("New password *"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    expect(api.setUserPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("New password *"), {
      target: { value: "a-long-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));

    await waitFor(() => expect(api.setUserPassword).toHaveBeenCalledWith(2, "a-long-password"));
  });

  it("removes a user after confirming", async () => {
    renderPage();
    await screen.findByText("Nimal Perera");
    fireEvent.click(within(rowOf("Nimal Perera")).getByRole("button", { name: /delete/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));

    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(2));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("User removed"));
  });
});
