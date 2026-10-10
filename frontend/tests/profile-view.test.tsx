import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import {
  ProfileView,
  type ProfileViewProps,
} from "@/app/(dashboard)/settings/profile/_components/profile-view";

const base: ProfileViewProps = {
  firstName: "Chamal",
  lastName: "Senarathna",
  fullName: "Chamal Senarathna",
  email: "chamals004@gmail.com",
  avatarUrl: null,
  roles: ["Super admin"],
  memberSince: "September 2026",
  isActive: true,
};

const renderView = (over: Partial<ProfileViewProps> = {}) =>
  render(<ProfileView {...base} {...over} />);

afterEach(cleanup);

describe("ProfileView", () => {
  it("shows who you are once, with your email and role", () => {
    renderView();
    expect(screen.getByRole("heading", { level: 1, name: "My Profile" })).toBeTruthy();
    expect(screen.getAllByText("Chamal Senarathna")).toHaveLength(1);
    expect(screen.getAllByText("chamals004@gmail.com")).toHaveLength(1);
    expect(within(screen.getByRole("list", { name: "Roles" })).getByText("Super admin")).toBeTruthy();
  });

  it("lists the account details that exist", () => {
    renderView();
    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("leaves out details it does not have, instead of filling the page with dashes", () => {
    renderView({ memberSince: null, isActive: null });
    expect(screen.queryByText("Member since")).toBeNull();
    expect(screen.queryByText("Account status")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("never invents an organisation", () => {
    renderView();
    expect(screen.queryByText(/organization/i)).toBeNull();
    expect(screen.queryByText("s3n4")).toBeNull();
  });

  it("says a deactivated account is deactivated", () => {
    renderView({ isActive: false });
    expect(screen.getByText("Deactivated")).toBeTruthy();
  });

  it("falls back to initials when there is no picture, and shows the picture when there is one", () => {
    renderView();
    expect(screen.getByText("CS")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    cleanup();

    renderView({ avatarUrl: "https://example.com/me.png" });
    expect(screen.getByRole("img", { name: "Chamal Senarathna" }).getAttribute("src")).toBe("https://example.com/me.png");
  });

  it("explains why the name and email cannot be edited here", () => {
    renderView();
    expect(screen.getByText(/managed by your administrator/)).toBeTruthy();
  });

  it("no longer shows the username and country that came from the old sign-in provider", () => {
    renderView();
    expect(screen.queryByText("Username")).toBeNull();
    expect(screen.queryByText("Country")).toBeNull();
  });

  it("renders extra sections under the account card", () => {
    render(
      <ProfileView {...base}>
        <section aria-label="Change password" />
      </ProfileView>,
    );
    expect(screen.getByRole("region", { name: "Change password" })).toBeTruthy();
  });

  it("shows several roles as separate pills", () => {
    renderView({ roles: ["Hiring manager", "Interviewer"] });
    const list = screen.getByRole("list", { name: "Roles" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });
});
