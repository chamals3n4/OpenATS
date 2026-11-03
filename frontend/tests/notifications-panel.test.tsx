import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ApiNotification } from "@/lib/notifications";

const mutate = vi.fn();
let rows: ApiNotification[] = [];
let unread = 0;

vi.mock("@/hooks/queries/use-notifications", () => ({
  useNotifications: () => ({ data: { data: rows, meta: { unread } } }),
  useMarkNotificationsRead: () => ({ mutate }),
}));

import { NotificationsPanel } from "@/components/layout/notifications-panel";

const row = (id: number, type: string, read: boolean): ApiNotification => ({
  id,
  type,
  candidateId: 100 + id,
  jobId: 1,
  candidateName: `Person ${id}`,
  jobTitle: "Engineer",
  readAt: read ? "2026-11-03T08:00:00.000Z" : null,
  createdAt: new Date(Date.now() - id * 60_000).toISOString(),
});

beforeEach(() => {
  mutate.mockClear();
  rows = [
    row(1, "application_received", false),
    row(2, "interview_booked", false),
    row(3, "assessment_completed", false),
    row(4, "offer_accepted", true),
    row(5, "interview_link_expired", true),
    row(6, "email_failed", true),
  ];
  unread = 3;
});

afterEach(cleanup);

const openPanel = () => fireEvent.click(screen.getByRole("button", { name: /^Notifications/ }));

describe("NotificationsPanel", () => {
  it("is closed until the bell is pressed, and the bell says how many are unread", () => {
    render(<NotificationsPanel />);
    const bell = screen.getByRole("button", { name: "Notifications, 3 unread" });

    expect(bell.querySelector("span[aria-hidden]")).not.toBeNull();
    expect(screen.queryByText("Mark all as read")).toBeNull();
  });

  it("shows no dot when everything is read", () => {
    unread = 0;
    render(<NotificationsPanel />);
    expect(screen.getByRole("button", { name: "Notifications" }).querySelector("span[aria-hidden]")).toBeNull();
  });

  it("opens on the newest few, worded for people, not on everything", () => {
    render(<NotificationsPanel />);
    openPanel();

    expect(screen.getByText("3 unread")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Person 1 applied for Engineer.")).toBeTruthy();
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

  it("marks everything read in one go", () => {
    render(<NotificationsPanel />);
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(mutate).toHaveBeenCalledWith(undefined);
  });

  it("marks one read when it is opened, and links to the right tab", () => {
    render(<NotificationsPanel />);
    openPanel();

    const link = screen.getByText("Interview booked").closest("a")!;
    expect(link.getAttribute("href")).toBe("/candidates/102?section=interviews");
    fireEvent.click(link);
    expect(mutate).toHaveBeenCalledWith([2]);
  });

  it("does not mark again one that is already read", () => {
    render(<NotificationsPanel />);
    openPanel();

    fireEvent.click(screen.getByText("Offer accepted").closest("a")!);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("says when there is nothing yet", () => {
    rows = [];
    unread = 0;
    render(<NotificationsPanel />);
    openPanel();

    expect(screen.getByText("You are all caught up")).toBeTruthy();
    expect(screen.getByText(/Nothing yet/)).toBeTruthy();
  });
});
