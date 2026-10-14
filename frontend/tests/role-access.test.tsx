import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const state = vi.hoisted(() => ({ role: undefined as string | undefined }));
const replace = vi.hoisted(() => vi.fn());
const serverFetch = vi.hoisted(() => vi.fn(async () => ({ data: [] })));

vi.mock("@/hooks/queries/use-user", () => ({
  useCurrentUser: () => ({
    data: state.role ? { data: { id: 1, role: state.role } } : undefined,
    isLoading: !state.role,
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/server-fetch", () => ({ serverFetch }));

import { RoleGuard } from "@/components/guards/role-guard";
import { DashboardPrefetch } from "@/components/providers/dashboard-prefetch";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.role = undefined;
});

describe("RoleGuard", () => {
  const guarded = (allow: "manager" | "super_admin") =>
    render(
      <RoleGuard allow={allow} redirectTo="/jobs">
        <p>Secret page</p>
      </RoleGuard>,
    );

  it("shows nothing while the role is loading", () => {
    guarded("manager");
    expect(screen.queryByText("Secret page")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("lets managers in", () => {
    state.role = "hiring_manager";
    guarded("manager");
    expect(screen.getByText("Secret page")).toBeTruthy();
  });

  it("sends interviewers away", () => {
    state.role = "interviewer";
    guarded("manager");
    expect(screen.queryByText("Secret page")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/jobs");
  });

  it("keeps super admin pages from hiring managers", () => {
    state.role = "hiring_manager";
    guarded("super_admin");
    expect(screen.queryByText("Secret page")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/jobs");
  });
});

describe("DashboardPrefetch", () => {
  const prefetched = async (role: string) => {
    state.role = role;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DashboardPrefetch />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(serverFetch).toHaveBeenCalledWith("/jobs"));
    return serverFetch.mock.calls.map((call) => (call as unknown[])[0]);
  };

  it("does not ask for managers only lists as an interviewer", async () => {
    const urls = await prefetched("interviewer");
    expect(urls).not.toContain("/users");
    expect(urls).not.toContain("/offers");
  });

  it("loads them for managers", async () => {
    const urls = await prefetched("hiring_manager");
    await waitFor(() => expect(serverFetch).toHaveBeenCalledWith("/offers"));
    expect(urls).toEqual(expect.arrayContaining(["/jobs", "/templates", "/company/departments"]));
    expect(serverFetch).toHaveBeenCalledWith("/users");
  });
});
