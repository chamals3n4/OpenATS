import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NotificationsPanel } from "@/components/layout/notifications-panel";

afterEach(cleanup);

const openPanel = () => fireEvent.click(screen.getByRole("button", { name: /^Notifications/ }));

describe("NotificationsPanel", () => {
  it("is closed until the bell is pressed, and the bell does not report the examples as unread", () => {
    render(<NotificationsPanel />);
    const bell = screen.getByRole("button", { name: "Notifications (preview with examples)" });

    expect(bell.querySelector("span[aria-hidden]")).toBeNull();
    expect(screen.queryByText("Mark all as read")).toBeNull();
  });

  it("opens on the newest few, not on everything", () => {
    render(<NotificationsPanel />);
    openPanel();

    expect(screen.getByText("3 unread")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Show 2 more" })).toBeTruthy();
  });

  it("shows the rest when asked, and can be put back", () => {
    render(<NotificationsPanel />);
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(6);

    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("shows only the unread ones when asked, with nothing more to show", () => {
    render(<NotificationsPanel />);
    openPanel();

    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /^Show \d+ more$/ })).toBeNull();
  });

  it("marks everything read, and then has nothing unread to show", () => {
    render(<NotificationsPanel />);
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(screen.getByText("You are all caught up")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Unread" }));
    expect(screen.getByText(/Nothing unread/)).toBeTruthy();
  });

  it("says plainly that these are examples", () => {
    render(<NotificationsPanel />);
    openPanel();

    expect(screen.getByText(/These are examples/)).toBeTruthy();
  });
});
